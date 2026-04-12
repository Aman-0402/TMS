from django.db.models import Q
from django.http import HttpResponse
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AuditLog, Manager, User
from .permissions import IsAdmin, IsAdminOrManager
from .serializers import (
    AdminUserSerializer,
    AuditLogSerializer,
    AvailableManagerUserSerializer,
    AvailableTrainerUserSerializer,
    CustomTokenObtainPairSerializer,
    ManagerSerializer,
    PendingUserSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)


class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def options(self, request, *args, **kwargs):
        """
        Handle CORS preflight OPTIONS request.
        Explicitly set CORS headers to ensure preflight passes.
        """
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = request.META.get('HTTP_ORIGIN', '*')
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken'
        response['Access-Control-Max-Age'] = '86400'
        response['Access-Control-Allow-Credentials'] = 'true'
        return response

    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        user = User.objects.filter(username=username).first()

        if user and not user.is_approved:
            if user.is_rejected:
                return Response(
                    {"error": f"Account rejected. Reason: {user.rejection_reason or 'No reason provided.'}"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(
                {"error": "Account not approved yet"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().post(request, *args, **kwargs)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def options(self, request, *args, **kwargs):
        """
        Handle CORS preflight OPTIONS request.
        Explicitly set CORS headers to ensure preflight passes.
        """
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = request.META.get('HTTP_ORIGIN', '*')
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken'
        response['Access-Control-Max-Age'] = '86400'
        response['Access-Control-Allow-Credentials'] = 'true'
        return response

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
            allowed_roles = ["TRAINER", "STUDENT"]
        else:
            raise PermissionDenied("You do not have permission to view pending approvals.")

        # Status filter: pending / approved / rejected / all (default=pending)
        filter_status = self.request.query_params.get("status", "pending").lower()
        role_filter = self.request.query_params.get("role", "")

        qs = User.objects.filter(role__in=allowed_roles).order_by("role", "username")

        if role_filter and role_filter.upper() in allowed_roles:
            qs = qs.filter(role=role_filter.upper())

        if filter_status == "approved":
            qs = qs.filter(is_approved=True)
        elif filter_status == "rejected":
            qs = qs.filter(is_rejected=True, is_approved=False)
        elif filter_status == "all":
            pass
        else:
            # default: pending (not approved, not rejected)
            qs = qs.filter(is_approved=False, is_rejected=False)

        return qs


class ApproveUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        target_user = User.objects.filter(pk=pk).first()

        if not target_user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in {"ADMIN", "MANAGER"} or not request.user.can_approve(target_user):
            raise PermissionDenied("You do not have permission to approve this user.")

        target_user.is_approved = True
        target_user.is_rejected = False
        target_user.rejection_reason = ""
        target_user.save(update_fields=["is_approved", "is_rejected", "rejection_reason"])

        return Response(
            {"message": f"{target_user.username} approved successfully"},
            status=status.HTTP_200_OK,
        )


class RejectUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        target_user = User.objects.filter(pk=pk).first()

        if not target_user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in {"ADMIN", "MANAGER"} or not request.user.can_approve(target_user):
            raise PermissionDenied("You do not have permission to reject this user.")

        reason = request.data.get("reason", "").strip()
        target_user.is_approved = False
        target_user.is_rejected = True
        target_user.rejection_reason = reason
        target_user.save(update_fields=["is_approved", "is_rejected", "rejection_reason"])

        return Response(
            {"message": f"{target_user.username} rejected successfully"},
            status=status.HTTP_200_OK,
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return AuditLog.objects.select_related("user").order_by("-created_at")


class AvailableTrainerUserListView(generics.ListAPIView):
    serializer_class = AvailableTrainerUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManager]

    def get_queryset(self):
        return User.objects.filter(
            role="TRAINER",
            is_approved=True,
            is_active=True,
        ).select_related("trainer_profile", "trainer_profile__batch").prefetch_related("trainer_profile__labs").order_by("username")


class AvailableManagerUserListView(generics.ListAPIView):
    serializer_class = AvailableManagerUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role="MANAGER",
            is_approved=True,
            is_active=True,
        ).select_related("manager", "manager__batch").order_by("username")


class MyProfileView(APIView):
    """Any authenticated user can GET/PATCH their own profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminUserListView(generics.ListAPIView):
    """Admin can list all non-student users with search & role filters."""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = User.objects.filter(
            role__in=["ADMIN", "MANAGER", "TRAINER"]
        ).select_related(
            "trainer_profile__batch",
            "manager__batch",
        ).order_by("role", "username")

        role = self.request.query_params.get("role", "")
        if role:
            qs = qs.filter(role=role.upper())

        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        return qs


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin can view, update, and delete any user's profile."""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.filter(role__in=["ADMIN", "MANAGER", "TRAINER"]).select_related(
            "trainer_profile__batch", "manager__batch"
        )


class ManagerViewSet(viewsets.ModelViewSet):
    serializer_class = ManagerSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Manager.objects.select_related("user", "batch").order_by("user__username")

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()
