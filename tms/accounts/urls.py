from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminUserDetailView,
    AdminUserListView,
    ApproveUserView,
    AuditLogViewSet,
    AvailableManagerUserListView,
    AvailableTrainerUserListView,
    CustomLoginView,
    ManagerViewSet,
    MyProfileView,
    PendingUserListView,
    RegisterView,
    RejectUserView,
)

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'managers', ManagerViewSet, basename='manager')

urlpatterns = [
    # Authentication endpoints
    path('login/', CustomLoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # User management endpoints
    path('pending-users/', PendingUserListView.as_view(), name='pending-users'),
    path('approve-user/<int:pk>/', ApproveUserView.as_view(), name='approve-user'),
    path('reject-user/<int:pk>/', RejectUserView.as_view(), name='reject-user'),
    path('profile/me/', MyProfileView.as_view(), name='profile-me'),

    # Admin user management
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),

    # Trainer and Manager lists
    path('trainers/', AvailableTrainerUserListView.as_view(), name='available-trainers'),
    path('managers/', AvailableManagerUserListView.as_view(), name='available-managers'),

    # ViewSet routes
    path('', include(router.urls)),
]
