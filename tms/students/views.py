from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Student
from .serializers import StudentSerializer


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Student.objects.select_related("batch", "lab").order_by("name")

        if user.role == "ADMIN":
            return base_queryset
        if user.role == "MANAGER":
            return base_queryset.filter(batch__manager__user=user)
        if user.role == "TRAINER":
            return base_queryset.filter(lab__trainer__user=user)

        return base_queryset.none()
