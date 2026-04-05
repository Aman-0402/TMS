from django.contrib import admin

from .models import Batch, Course


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("name", "certification")
    search_fields = ("name", "certification")


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ("name", "course", "start_date", "end_date", "status", "created_by")
    list_filter = ("course", "status", "start_date")
    list_select_related = ("course", "created_by")
    search_fields = ("name", "course__name", "course__certification", "created_by__username")
