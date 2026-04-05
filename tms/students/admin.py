from django.contrib import admin

from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("ug_number", "name", "department", "email", "phone", "batch", "lab")
    list_select_related = ("batch", "lab")
    search_fields = ("ug_number", "name", "department", "email", "phone", "batch__name", "lab__name")
