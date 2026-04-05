from rest_framework.permissions import BasePermission


class RolePermission(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) in self.allowed_roles
        )


class IsAdmin(RolePermission):
    allowed_roles = ("ADMIN",)


class IsManager(RolePermission):
    allowed_roles = ("MANAGER",)


class IsTrainer(RolePermission):
    allowed_roles = ("TRAINER",)


class IsManagerOrTrainer(RolePermission):
    allowed_roles = ("MANAGER", "TRAINER")


class IsAdminOrManager(RolePermission):
    allowed_roles = ("ADMIN", "MANAGER")
