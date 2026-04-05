from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Result
from .serializers import ResultSerializer


class ResultViewSet(viewsets.ModelViewSet):
    serializer_class = ResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Result.objects.select_related("student", "batch").order_by("-total_percentage")

        if user.role == "ADMIN":
            return base_queryset
        if user.role == "MANAGER":
            return base_queryset.filter(batch__manager__user=user)
        if user.role == "TRAINER":
            return base_queryset.filter(student__lab__trainer__user=user)

        return base_queryset.none()
