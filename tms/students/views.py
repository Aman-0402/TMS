import pandas as pd
from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.mixins import AuditLogMixin, RoleScopedQuerysetMixin
from accounts.models import AuditLog, Manager
from accounts.permissions import IsAdmin, IsManager, IsTrainer

from batch.models import Batch
from labs.models import Lab
from .models import Student
from .serializers import StudentSerializer


class DenyAllPermission(BasePermission):
    def has_permission(self, request, view):
        return False


class StudentViewSet(AuditLogMixin, RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "lab__trainer__user"

    def get_permissions(self):
        role_permission_map = {
            "ADMIN": IsAdmin,
            "MANAGER": IsManager,
            "TRAINER": IsTrainer,
        }
        role = getattr(self.request.user, "role", None)
        permission_class = role_permission_map.get(role, DenyAllPermission)

        if self.action in {
            "list",
            "retrieve",
            "create",
            "update",
            "partial_update",
            "destroy",
            "upload_excel",
        }:
            return [IsAuthenticated(), permission_class()]

        return [IsAuthenticated()]

    def get_base_queryset(self):
        return Student.objects.select_related("batch", "lab", "lab__trainer").order_by("name")

    def perform_create(self, serializer):
        self._validate_write_scope(serializer)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        self._assert_user_can_modify_student(serializer.instance)
        self._validate_write_scope(serializer)
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        self._assert_user_can_modify_student(instance)
        super().perform_destroy(instance)

    def _assert_user_can_modify_student(self, student):
        user = self.request.user

        if user.role == "ADMIN":
            return

        if user.role == "MANAGER":
            if not Manager.objects.filter(user=user, batch=student.batch).exists():
                raise PermissionDenied("Managers can only modify students in their assigned batch.")
            return

        if user.role == "TRAINER":
            if not student.lab or student.lab.trainer.user_id != user.id:
                raise PermissionDenied("Trainers can only modify students in their assigned lab.")
            return

        raise PermissionDenied("You do not have permission to modify this student.")

    def _validate_write_scope(self, serializer):
        user = self.request.user
        batch = serializer.validated_data.get("batch", getattr(serializer.instance, "batch", None))
        lab = serializer.validated_data.get("lab", getattr(serializer.instance, "lab", None))

        if user.role == "ADMIN":
            return

        if user.role == "MANAGER":
            if not batch or not Manager.objects.filter(user=user, batch=batch).exists():
                raise PermissionDenied("Managers can only manage students in their assigned batch.")
            return

        if user.role == "TRAINER":
            if not lab or lab.trainer.user_id != user.id:
                raise PermissionDenied("Trainers can only manage students in their assigned lab.")
            return

        raise PermissionDenied("You do not have permission to manage students.")

    @action(detail=False, methods=["post"], url_path="upload-excel")
    def upload_excel(self, request):
        uploaded_file = request.FILES.get("file")
        batch_id = request.data.get("batch")

        if not uploaded_file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if not batch_id:
            return Response({"error": "Batch is required"}, status=status.HTTP_400_BAD_REQUEST)

        batch = Batch.objects.filter(pk=batch_id).first()
        if not batch:
            return Response({"error": "Batch not found"}, status=status.HTTP_404_NOT_FOUND)

        self._validate_batch_upload_scope(batch)

        try:
            dataframe = pd.read_excel(uploaded_file)
        except Exception:
            return Response(
                {"error": "Unable to read the uploaded Excel file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_columns = {"UG Number", "Name", "Department", "Lab"}
        missing_columns = required_columns.difference(dataframe.columns)
        if missing_columns:
            return Response(
                {
                    "error": "Missing required columns.",
                    "missing_columns": sorted(missing_columns),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        labs_by_name = {
            str(lab.name).strip(): lab
            for lab in Lab.objects.select_related("trainer", "trainer__user").filter(batch=batch)
        }
        created_count = 0
        skipped_duplicates = 0

        with transaction.atomic():
            for row_number, row in enumerate(dataframe.iterrows(), start=2):
                _, row_data = row
                ug_number = self._get_excel_value(row_data, "UG Number")
                name = self._get_excel_value(row_data, "Name")
                department = self._get_excel_value(row_data, "Department")
                lab_name = self._get_excel_value(row_data, "Lab")
                email = self._get_excel_value(row_data, "Email")
                phone = self._get_excel_value(row_data, "Phone")

                if not ug_number or not name or not department or not lab_name:
                    return Response(
                        {"error": f"Required value missing in row {row_number}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                lab = labs_by_name.get(lab_name)
                if not lab:
                    return Response(
                        {"error": f"Lab '{lab_name}' not found in batch '{batch.name}'."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                self._validate_lab_upload_scope(lab)

                student, created = Student.objects.get_or_create(
                    batch=batch,
                    ug_number=ug_number,
                    defaults={
                        "name": name,
                        "department": department,
                        "email": email,
                        "phone": phone,
                        "lab": lab,
                    },
                )

                if not created:
                    skipped_duplicates += 1
                    continue

                created_count += 1
                self._log_audit_event(
                    AuditLog.Action.CREATE,
                    student,
                    description=f"Created Student via Excel upload: {student}",
                )

        return Response(
            {
                "message": f"{created_count} students uploaded successfully",
                "created_count": created_count,
                "skipped_duplicates": skipped_duplicates,
            },
            status=status.HTTP_201_CREATED,
        )

    def _validate_batch_upload_scope(self, batch):
        user = self.request.user

        if user.role == "ADMIN":
            return

        if user.role == "MANAGER":
            if not Manager.objects.filter(user=user, batch=batch).exists():
                raise PermissionDenied("Managers can only upload students to their assigned batch.")
            return

        if user.role == "TRAINER":
            if not Lab.objects.filter(batch=batch, trainer__user=user).exists():
                raise PermissionDenied("Trainers can only upload students to batches with their labs.")
            return

        raise PermissionDenied("You do not have permission to upload students.")

    def _validate_lab_upload_scope(self, lab):
        user = self.request.user

        if user.role == "TRAINER" and lab.trainer.user_id != user.id:
            raise PermissionDenied("Trainers can only assign students to their own labs.")

    def _get_excel_value(self, row_data, column_name):
        value = row_data.get(column_name, "")
        if pd.isna(value):
            return ""
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value).strip()
