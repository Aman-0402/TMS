from rest_framework import viewsets

from .models import Student
from .serializers import StudentSerializer


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("batch", "lab").all().order_by("name")
    serializer_class = StudentSerializer
