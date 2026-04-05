from django.db import transaction
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

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_base_queryset(self):
        qs = StudentAttendance.objects.select_related("student", "batch").order_by(
            "-date", "student__name"
        )
        batch_id = self.request.query_params.get("batch")
        date = self.request.query_params.get("date")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        if date:
            qs = qs.filter(date=date)
        return qs

    def _assert_trainer_batch_access(self, batch):
        user = self.request.user
        if user.role == "TRAINER":
            if not batch.trainers.filter(user=user).exists():
                raise PermissionDenied("You can only manage attendance for your assigned batch.")

    def perform_create(self, serializer):
        batch = serializer.validated_data.get("batch")
        self._assert_trainer_batch_access(batch)
        serializer.save()

    def perform_update(self, serializer):
        batch = serializer.validated_data.get("batch", serializer.instance.batch)
        self._assert_trainer_batch_access(batch)
        serializer.save()

    @action(detail=False, methods=["post"], url_path="bulk-mark")
    def bulk_mark(self, request):
        date = request.data.get("date")
        batch_id = request.data.get("batch")
        records = request.data.get("records", [])

        if not date:
            return Response({"error": "date is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not batch_id:
            return Response({"error": "batch is required."}, status=status.HTTP_400_BAD_REQUEST)
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

        valid_statuses = {s.value for s in StudentAttendance.Status}
        errors = []
        for i, record in enumerate(records):
            if "student" not in record:
                errors.append(f"Record {i}: 'student' field is required.")
            if record.get("status") not in valid_statuses:
                errors.append(
                    f"Record {i}: invalid status '{record.get('status')}'. "
                    f"Must be one of {sorted(valid_statuses)}."
                )

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        student_ids = [r["student"] for r in records]
        existing_students = set(
            Student.objects.filter(pk__in=student_ids, batch=batch).values_list("pk", flat=True)
        )
        invalid_ids = [sid for sid in student_ids if sid not in existing_students]
        if invalid_ids:
            return Response(
                {"error": f"Students {invalid_ids} do not belong to this batch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for record in records:
                _, created = StudentAttendance.objects.update_or_create(
                    student_id=record["student"],
                    date=date,
                    defaults={"batch": batch, "status": record["status"]},
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
