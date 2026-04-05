from rest_framework import viewsets

from .models import Batch
from .serializers import BatchSerializer


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all().order_by("-created_at")
    serializer_class = BatchSerializer
