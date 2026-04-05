from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AuditLog, User
from .permissions import IsAdmin
from .serializers import (
    AuditLogSerializer,
    CustomTokenObtainPairSerializer,
    PendingUserSerializer,
    RegisterSerializer,
)


class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        user = User.objects.filter(username=username).first()

        if user and not user.is_approved:
            return Response(
                {"error": "Account not approved yet"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().post(request, *args, **kwargs)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Waiting for approval"},
            status=status.HTTP_201_CREATED,
        )


class PendingUserListView(generics.ListAPIView):
    serializer_class = PendingUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == "ADMIN":
            allowed_roles = ["MANAGER", "TRAINER"]
        elif user.role == "MANAGER":
            allowed_roles = ["STUDENT"]
        else:
            raise PermissionDenied("You do not have permission to view pending approvals.")

        return User.objects.filter(is_approved=False, role__in=allowed_roles).order_by("username")


class ApproveUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        target_user = User.objects.filter(pk=pk, is_approved=False).first()

        if not target_user:
            return Response(
                {"error": "Pending user not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.role not in {"ADMIN", "MANAGER"} or not request.user.can_approve(target_user):
            raise PermissionDenied("You do not have permission to approve this user.")

        target_user.is_approved = True
        target_user.save(update_fields=["is_approved"])

        return Response(
            {"message": f"{target_user.username} approved successfully"},
            status=status.HTTP_200_OK,
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return AuditLog.objects.select_related("user").order_by("-created_at")
