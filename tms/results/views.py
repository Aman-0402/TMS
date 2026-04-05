from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.mixins import AuditLogMixin, RoleScopedQuerysetMixin

from .models import Result
from .serializers import ResultSerializer


class ResultViewSet(AuditLogMixin, RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = ResultSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "student__lab__trainer__user"

    def get_base_queryset(self):
        qs = Result.objects.select_related("student", "batch").order_by(
            "-total_percentage", "student__name"
        )

        batch_id = self.request.query_params.get("batch")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)

        # Filter: only students who passed Final Mock (eligible for Final Exam)
        eligible_only = self.request.query_params.get("eligible_only")
        if eligible_only == "true":
            qs = qs.filter(is_final_mock_pass=True)

        # Filter: only students who failed Final Mock
        failed_mock = self.request.query_params.get("failed_mock")
        if failed_mock == "true":
            qs = qs.filter(is_final_mock_pass=False)

        # Filter: only students who passed Final Exam
        passed_exam = self.request.query_params.get("passed_exam")
        if passed_exam == "true":
            qs = qs.filter(is_pass=True)

        # Filter: only students who failed Final Exam
        failed_exam = self.request.query_params.get("failed_exam")
        if failed_exam == "true":
            qs = qs.filter(is_pass=False)

        return qs
