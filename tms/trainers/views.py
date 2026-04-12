import logging

from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import IntegrityError

from accounts.models import Manager
from accounts.permissions import IsAdminOrManager

from .models import Trainer
from .serializers import TrainerSerializer


logger = logging.getLogger(__name__)


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
        try:
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
        except PermissionDenied as exc:
            logger.exception("Permission denied while creating trainer assignment. Payload: %s", request.data)
            return self._build_assignment_error_response(exc, status.HTTP_403_FORBIDDEN)
        except (ValidationError, IntegrityError) as exc:
            logger.exception("Unable to create trainer assignment. Payload: %s", request.data)
            return self._build_assignment_error_response(exc, status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Unexpected trainer assignment failure. Payload: %s", request.data)
            return self._build_assignment_error_response(exc, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        try:
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
        except PermissionDenied as exc:
            logger.exception("Permission denied while updating trainer assignment. Payload: %s", request.data)
            return self._build_assignment_error_response(exc, status.HTTP_403_FORBIDDEN)
        except (ValidationError, IntegrityError) as exc:
            logger.exception("Unable to update trainer assignment. Payload: %s", request.data)
            return self._build_assignment_error_response(exc, status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Unexpected trainer assignment update failure. Payload: %s", request.data)
            return self._build_assignment_error_response(exc, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _validate_batch_scope(self, batch):
        user = self.request.user

        if user.role == "ADMIN":
            return

        if not Manager.objects.filter(user=user, batch=batch).exists():
            raise PermissionDenied("Managers can only assign trainers within their own batch.")

    def _build_assignment_error_response(self, exc, status_code):
        detail = getattr(exc, "detail", None)

        if isinstance(detail, dict):
            return Response(detail, status=status_code)

        if isinstance(detail, list):
            return Response({"error": str(detail[0])}, status=status_code)

        return Response({"error": str(detail or exc)}, status=status_code)
