from .models import AuditLog
from .utils import log_action


class RoleScopedQuerysetMixin:
    manager_lookup = None
    trainer_lookup = None
    manager_distinct = False
    trainer_distinct = False

    def get_base_queryset(self):
        raise NotImplementedError("Subclasses must implement get_base_queryset().")

    def get_queryset(self):
        user = self.request.user
        queryset = self.get_base_queryset()
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
