from django.contrib import admin

from .models import Exam, ExamSlot, StudentExamSlot


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ("batch", "exam_date")
    list_filter = ("exam_date", "batch")
    list_select_related = ("batch",)
    search_fields = ("batch__name",)


@admin.register(ExamSlot)
class ExamSlotAdmin(admin.ModelAdmin):
    list_display = ("exam", "start_time", "end_time", "lab")
    list_filter = ("exam__exam_date", "exam__batch")
    list_select_related = ("exam", "exam__batch", "lab")
    search_fields = ("exam__batch__name", "lab__name")


@admin.register(StudentExamSlot)
class StudentExamSlotAdmin(admin.ModelAdmin):
    list_display = ("student", "exam_slot")
    list_select_related = ("student", "exam_slot", "exam_slot__exam", "exam_slot__lab")
    search_fields = ("student__name", "student__email", "exam_slot__lab__name")
