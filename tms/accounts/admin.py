from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


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

    fieldsets = UserAdmin.fieldsets + (
        ("TMS Access", {"fields": ("role", "is_approved")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("TMS Access", {"fields": ("role", "is_approved")}),
    )
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)
