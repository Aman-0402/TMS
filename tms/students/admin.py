from django.contrib import admin

from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "batch", "lab")
    list_select_related = ("batch", "lab")
    search_fields = ("name", "email", "phone", "batch__name", "lab__name")
