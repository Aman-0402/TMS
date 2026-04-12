from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Manager
from accounts.permissions import IsAdminOrManager

from .models import Trainer
from .serializers import TrainerSerializer


class TrainerViewSet(viewsets.ModelViewSet):
    serializer_class = TrainerSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def get_queryset(self):
        queryset = Trainer.objects.select_related("user", "batch").prefetch_related("labs").order_by("user__username")

        if self.request.user.role == "ADMIN":
            return queryset

        return queryset.filter(batch__manager__user=self.request.user)

    def perform_create(self, serializer):
        batch = serializer.validated_data["batch"]
        self._validate_batch_scope(batch)
        serializer.save()

    def perform_update(self, serializer):
        batch = serializer.validated_data.get("batch", serializer.instance.batch)
        self._validate_batch_scope(batch)
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {
                "message": "Trainer assigned successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {
                "message": "Trainer assignment updated successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def _validate_batch_scope(self, batch):
        user = self.request.user

        if user.role == "ADMIN":
            return

        if not Manager.objects.filter(user=user, batch=batch).exists():
            raise PermissionDenied("Managers can only assign trainers within their own batch.")
