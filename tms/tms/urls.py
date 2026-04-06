"""
URL configuration for tms project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    AdminUserDetailView,
    AdminUserListView,
    ApproveUserView,
    CustomLoginView,
    MyProfileView,
    PendingUserListView,
    RegisterView,
    RejectUserView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tms.api_urls')),
    path('api/', include('students.urls')),
    path('api/register/', RegisterView.as_view()),
    path('api/login/', CustomLoginView.as_view()),
    path('api/pending-users/', PendingUserListView.as_view()),
    path('api/approve-user/<int:pk>/', ApproveUserView.as_view()),
    path('api/reject-user/<int:pk>/', RejectUserView.as_view()),
    path('api/profile/me/', MyProfileView.as_view()),
    path('api/users/', AdminUserListView.as_view()),
    path('api/users/<int:pk>/', AdminUserDetailView.as_view()),
    path('api/token/', CustomLoginView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
]
