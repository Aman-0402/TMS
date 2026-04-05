from django.contrib import admin

from .models import StudentAttendance, TrainerAttendance


@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display = ("student", "batch", "date", "status")
    list_filter = ("status", "date", "batch")
    list_select_related = ("student", "batch")
    search_fields = ("student__name", "student__email", "batch__name")


@admin.register(TrainerAttendance)
class TrainerAttendanceAdmin(admin.ModelAdmin):
    list_display = ("trainer", "batch", "date", "status")
    list_filter = ("status", "date", "batch")
    list_select_related = ("trainer", "trainer__user", "batch")
    search_fields = ("trainer__user__username", "trainer__user__email", "batch__name")
