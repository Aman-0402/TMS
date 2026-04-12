"""
URL configuration for accounts app.
Handles all authentication and user management endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomLoginView,
    RegisterView,
    PendingUserListView,
    ApproveUserView,
    RejectUserView,
    MyProfileView,
    AdminUserListView,
    AdminUserDetailView,
    AvailableTrainerUserListView,
    AvailableManagerUserListView,
    AuditLogViewSet,
    ManagerViewSet,
)

# Router for ViewSets
router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'managers', ManagerViewSet, basename='manager')

# Main URL patterns
urlpatterns = [
    # ==================== AUTHENTICATION ====================
    path('login/', CustomLoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', CustomLoginView.as_view(), name='token'),  # Alternative token endpoint
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # ==================== USER MANAGEMENT ====================
    path('profile/me/', MyProfileView.as_view(), name='my-profile'),
    path('pending-users/', PendingUserListView.as_view(), name='pending-users'),
    path('approve-user/<int:pk>/', ApproveUserView.as_view(), name='approve-user'),
    path('reject-user/<int:pk>/', RejectUserView.as_view(), name='reject-user'),

    # ==================== ADMIN USER MANAGEMENT ====================
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),

    # ==================== AVAILABLE USERS ====================
    path('trainers/', AvailableTrainerUserListView.as_view(), name='available-trainers'),
    path('managers-list/', AvailableManagerUserListView.as_view(), name='available-managers'),

    # ==================== VIEWSET ROUTES ====================
    path('', include(router.urls)),
]
