from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import AuditLog
from .utils import log_action


class RequestDebugMixin:
    def debug_request_user(self, context):
        if not settings.DEBUG:
            return

        request = getattr(self, "request", None)
        user = getattr(request, "user", None)
        auth = getattr(request, "auth", None)
        auth_header = request.headers.get("Authorization", "") if request else ""

        print(
            {
                "debug_context": context,
                "viewset": self.__class__.__name__,
                "action": getattr(self, "action", None),
                "request_user": str(user) if user else None,
                "request_user_role": getattr(user, "role", None),
                "is_authenticated": getattr(user, "is_authenticated", False),
                "jwt_auth_present": bool(auth),
                "authorization_header_present": bool(auth_header),
                "authorization_header_prefix": auth_header[:20] if auth_header else "",
            }
        )


class RoleScopedQuerysetMixin(RequestDebugMixin):
    manager_lookup = None
    trainer_lookup = None
    manager_distinct = False
    trainer_distinct = False

    def get_base_queryset(self):
        raise NotImplementedError("Subclasses must implement get_base_queryset().")

    def _filter_queryset_by_role(self, queryset):
        user = self.request.user
        role = getattr(user, "role", None)

        if role == "ADMIN":
            return queryset

        if role == "MANAGER" and self.manager_lookup:
            filtered_queryset = queryset.filter(**{self.manager_lookup: user})
            return filtered_queryset.distinct() if self.manager_distinct else filtered_queryset

        if role == "TRAINER" and self.trainer_lookup:
            filtered_queryset = queryset.filter(**{self.trainer_lookup: user})
            return filtered_queryset.distinct() if self.trainer_distinct else filtered_queryset

        return queryset.none()

    def get_scoped_queryset(self, include_deleted=False):
        queryset = self._filter_queryset_by_role(self.get_base_queryset())

        if not include_deleted and hasattr(queryset.model, "is_deleted"):
            queryset = queryset.filter(is_deleted=False)

        return queryset

    def get_queryset(self):
        self.debug_request_user("get_queryset")
        return self.get_scoped_queryset()


class AuditLogMixin:
    action_labels = {
        AuditLog.Action.CREATE: "Created",
        AuditLog.Action.UPDATE: "Updated",
        AuditLog.Action.DELETE: "Deleted",
    }

    def get_audit_model_name(self, instance):
        return instance.__class__.__name__

    def get_audit_description(self, action, instance):
        action_label = self.action_labels.get(action, action.title())
        return f"{action_label} {self.get_audit_model_name(instance)}: {instance}"

    def _log_audit_event(self, action, instance, object_id=None, description=None):
        object_pk = object_id if object_id is not None else instance.pk
        log_action(
            self.request.user,
            action,
            self.get_audit_model_name(instance),
            object_pk,
            description or self.get_audit_description(action, instance),
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_audit_event(AuditLog.Action.CREATE, instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_audit_event(AuditLog.Action.UPDATE, instance)

    def perform_destroy(self, instance):
        object_id = instance.pk
        description = self.get_audit_description(AuditLog.Action.DELETE, instance)
        instance.delete()
        self._log_audit_event(
            AuditLog.Action.DELETE,
            instance,
            object_id=object_id,
            description=description,
        )


class SoftDeleteMixin:
    delete_error_message = "Unable to delete this record."
    restore_error_message = "Unable to restore this record."
    already_deleted_message = "Already deleted"
    not_deleted_message = "Record is not deleted."
    delete_success_message = "Deleted successfully."
    restore_success_message = "Restored successfully."

    def get_soft_delete_queryset(self):
        if hasattr(self, "get_scoped_queryset"):
            return self.get_scoped_queryset(include_deleted=True)

        queryset = self.get_base_queryset() if hasattr(self, "get_base_queryset") else super().get_queryset()
        return queryset

    def get_soft_delete_instance(self):
        lookup_value = self.kwargs.get(self.lookup_field, self.kwargs.get("pk"))
        return get_object_or_404(
            self.get_soft_delete_queryset(),
            **{self.lookup_field: lookup_value},
        )

    def _format_validation_error(self, exc):
        detail = exc.detail

        if isinstance(detail, list) and detail:
            return str(detail[0])

        if isinstance(detail, dict) and detail:
            first_value = next(iter(detail.values()))
            if isinstance(first_value, list) and first_value:
                return str(first_value[0])
            return str(first_value)

        return str(detail)

    def validate_soft_delete(self, instance):
        return None

    def destroy(self, request, *args, **kwargs):
        instance = self.get_soft_delete_instance()

        if instance.is_deleted:
            return Response(
                {"error": self.already_deleted_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            self.validate_soft_delete(instance)
            self.perform_destroy(instance)
        except ValidationError as exc:
            return Response(
                {"error": self._format_validation_error(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    "error": self.delete_error_message,
                    "details": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": self.delete_success_message}, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])

        if hasattr(self, "_log_audit_event"):
            self._log_audit_event(
                AuditLog.Action.DELETE,
                instance,
                description=f"Soft deleted {instance.__class__.__name__}: {instance}",
            )

    @action(detail=True, methods=["post"])
    def restore(self, request, *args, **kwargs):
        instance = self.get_soft_delete_instance()

        if not instance.is_deleted:
            return Response(
                {"error": self.not_deleted_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            instance.is_deleted = False
            instance.deleted_at = None
            instance.save(update_fields=["is_deleted", "deleted_at"])
        except Exception as exc:
            return Response(
                {
                    "error": self.restore_error_message,
                    "details": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(self, "_log_audit_event"):
            self._log_audit_event(
                AuditLog.Action.UPDATE,
                instance,
                description=f"Restored {instance.__class__.__name__}: {instance}",
            )

        return Response({"message": self.restore_success_message}, status=status.HTTP_200_OK)
