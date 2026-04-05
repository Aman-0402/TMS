from rest_framework import viewsets

from .models import Lab
from .serializers import LabSerializer


class LabViewSet(viewsets.ModelViewSet):
    queryset = Lab.objects.select_related("batch", "trainer", "trainer__user").all().order_by("name")
    serializer_class = LabSerializer
