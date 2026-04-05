from rest_framework import viewsets

from .models import Result
from .serializers import ResultSerializer


class ResultViewSet(viewsets.ModelViewSet):
    queryset = Result.objects.select_related("student", "batch").all().order_by("-total_percentage")
    serializer_class = ResultSerializer
