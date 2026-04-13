from io import BytesIO

from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.mixins import RoleScopedQuerysetMixin
from accounts.permissions import IsAdminOrManager
from batch.models import Batch
from students.models import Student

from .models import StudentAttendance, WorkingDay
from .serializers import StudentAttendanceSerializer, WorkingDaySerializer

VALID_SLOTS = {s.value for s in StudentAttendance.Slot}
VALID_STATUSES = {s.value for s in StudentAttendance.Status}


class WorkingDayViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = WorkingDaySerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "batch__trainers__user"
    trainer_distinct = True

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAdminOrManager()]
        return [IsAuthenticated()]

    def get_base_queryset(self):
        qs = WorkingDay.objects.select_related("batch").order_by("date")
        batch_id = self.request.query_params.get("batch")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StudentAttendanceViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = StudentAttendanceSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "batch__trainers__user"
    trainer_distinct = True

    def get_base_queryset(self):
        qs = StudentAttendance.objects.select_related(
            "student",
            "batch",
            "lab",
            "lab__trainer",
            "lab__trainer__user",
        ).order_by(
            "-date", "slot", "student__name"
        )
        batch_id = self.request.query_params.get("batch")
        date = self.request.query_params.get("date")
        slot = self.request.query_params.get("slot")
        lab_id = self.request.query_params.get("lab")
        trainer_id = self.request.query_params.get("trainer")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        if date:
            qs = qs.filter(date=date)
        if slot:
            qs = qs.filter(slot=slot)
        if lab_id:
            qs = qs.filter(lab_id=lab_id)
        if trainer_id:
            qs = qs.filter(lab__trainer_id=trainer_id)
        return qs

    def _assert_trainer_batch_access(self, batch):
        user = self.request.user
        if user.role == "TRAINER":
            if not batch.trainers.filter(user=user).exists():
                raise PermissionDenied("You can only manage attendance for your assigned batch.")

    def perform_create(self, serializer):
        self._assert_trainer_batch_access(serializer.validated_data.get("batch"))
        student = serializer.validated_data.get("student")
        serializer.save(lab=getattr(student, "lab", None))

    def perform_update(self, serializer):
        batch = serializer.validated_data.get("batch", serializer.instance.batch)
        self._assert_trainer_batch_access(batch)
        student = serializer.validated_data.get("student", serializer.instance.student)
        serializer.save(lab=getattr(student, "lab", None))

    @action(detail=False, methods=["post"], url_path="bulk-mark")
    def bulk_mark(self, request):
        date = request.data.get("date")
        batch_id = request.data.get("batch")
        slot = str(request.data.get("slot", ""))
        records = request.data.get("records", [])

        if not date:
            return Response({"error": "date is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not batch_id:
            return Response({"error": "batch is required."}, status=status.HTTP_400_BAD_REQUEST)
        if slot not in VALID_SLOTS:
            return Response(
                {"error": f"slot must be one of {sorted(VALID_SLOTS)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not records:
            return Response({"error": "records cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        batch = Batch.objects.filter(pk=batch_id, is_deleted=False).first()
        if not batch:
            return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)

        self._assert_trainer_batch_access(batch)

        if not WorkingDay.objects.filter(batch=batch, date=date).exists():
            return Response(
                {"error": "Selected date is not a working day for this batch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        errors = []
        for i, record in enumerate(records):
            if "student" not in record:
                errors.append(f"Record {i}: 'student' field is required.")
            if record.get("status") not in VALID_STATUSES:
                errors.append(
                    f"Record {i}: invalid status '{record.get('status')}'. "
                    f"Must be one of {sorted(VALID_STATUSES)}."
                )
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        student_ids = [r["student"] for r in records]
        valid_student_ids = set(
            Student.objects.filter(pk__in=student_ids, batch=batch).values_list("pk", flat=True)
        )
        invalid_ids = [sid for sid in student_ids if sid not in valid_student_ids]
        if invalid_ids:
            return Response(
                {"error": f"Students {invalid_ids} do not belong to this batch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student_lab_map = {
            student.id: student.lab
            for student in Student.objects.select_related("lab").filter(pk__in=valid_student_ids)
        }

        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for record in records:
                _, created = StudentAttendance.objects.update_or_create(
                    student_id=record["student"],
                    date=date,
                    slot=slot,
                    defaults={
                        "batch": batch,
                        "lab": student_lab_map.get(record["student"]),
                        "status": record["status"],
                    },
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        return Response(
            {
                "message": "Attendance saved successfully.",
                "created": created_count,
                "updated": updated_count,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        Returns per-student attendance summary for a batch.
        Counts total slots available (working_days × 3) and attended
        (PRESENT or LATE). Useful for filtering low-attendance students.
        """
        batch_id = request.query_params.get("batch")
        if not batch_id:
            return Response({"error": "batch is required."}, status=status.HTTP_400_BAD_REQUEST)

        batch = Batch.objects.filter(pk=batch_id, is_deleted=False).first()
        if not batch:
            return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == "TRAINER" and not batch.trainers.filter(user=user).exists():
            raise PermissionDenied("Access denied.")
        if user.role == "MANAGER":
            from accounts.models import Manager
            if not Manager.objects.filter(user=user, batch=batch).exists():
                raise PermissionDenied("Access denied.")

        total_working_days = WorkingDay.objects.filter(batch=batch).count()
        total_slots_per_student = total_working_days * 3

        students = Student.objects.filter(batch=batch, is_deleted=False).order_by("name")

        attended_counts = (
            StudentAttendance.objects.filter(
                batch=batch,
                status__in=[StudentAttendance.Status.PRESENT, StudentAttendance.Status.LATE],
            )
            .values("student_id")
            .annotate(attended=Count("id"))
        )
        attended_map = {row["student_id"]: row["attended"] for row in attended_counts}

        results = []
        for student in students:
            attended = attended_map.get(student.id, 0)
            pct = round(attended / total_slots_per_student * 100, 1) if total_slots_per_student else 0
            results.append(
                {
                    "student_id": student.id,
                    "student_name": student.name,
                    "ug_number": student.ug_number,
                    "total_slots": total_slots_per_student,
                    "attended_slots": attended,
                    "attendance_percentage": pct,
                }
            )

        return Response(results)

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Attendance"
        worksheet.append(
            [
                "Date",
                "Batch",
                "Lab",
                "Trainer",
                "Student",
                "UG Number",
                "Slot",
                "Status",
            ]
        )

        for record in queryset:
            worksheet.append(
                [
                    record.date.isoformat(),
                    record.batch.name if record.batch_id else "",
                    record.lab.name if record.lab_id else "",
                    record.lab.trainer.user.username if record.lab_id and record.lab and record.lab.trainer_id else "",
                    record.student.name,
                    record.student.ug_number,
                    record.get_slot_display(),
                    record.get_status_display(),
                ]
            )

        output = BytesIO()
        workbook.save(output)
        output.seek(0)

        filename_parts = [
            "attendance",
            request.query_params.get("batch") or "all-batches",
            request.query_params.get("date") or "all-dates",
        ]
        filename = "-".join(filename_parts) + ".xlsx"

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
