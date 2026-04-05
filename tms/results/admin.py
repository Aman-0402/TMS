from django.contrib import admin

from .models import Result


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "batch",
        "mid_test",
        "final_mock",
        "final_exam",
        "total_percentage",
        "is_pass",
    )
    list_filter = ("batch", "is_pass")
    list_select_related = ("student", "batch")
    search_fields = ("student__name", "student__email", "batch__name")
    readonly_fields = ("total_percentage", "is_pass")
