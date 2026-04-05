from .models import AuditLog


def log_action(user, action, model_name, object_id, description=""):
    return AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        model_name=model_name,
        object_id=object_id,
        description=description,
    )
