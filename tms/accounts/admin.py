from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AuditLog, Manager, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "role",
        "is_approved",
        "is_staff",
    )
    list_filter = ("role", "is_approved", "is_staff", "is_superuser", "is_active")
    list_editable = ("is_approved",)
    actions = ("approve_users",)

    fieldsets = UserAdmin.fieldsets + (
        ("TMS Access", {"fields": ("role", "is_approved")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("TMS Access", {"fields": ("role", "is_approved")}),
    )
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)

    @admin.action(description="Approve selected users")
    def approve_users(self, request, queryset):
        queryset.update(is_approved=True)


@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    list_display = ("user", "batch")
    list_select_related = ("user", "batch")
    search_fields = ("user__username", "user__email", "batch__name")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "model_name", "object_id", "created_at")
    list_filter = ("action", "model_name", "created_at")
    list_select_related = ("user",)
    search_fields = ("user__username", "model_name", "description")
    readonly_fields = ("created_at",)
