"""
Main URL configuration for TMS project.
Routes all API endpoints and admin panel.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # ==================== API ENDPOINTS ====================
    # Accounts (authentication, users, etc.) - MUST BE FIRST
    path('api/', include('accounts.urls')),

    # Students app
    path('api/', include('students.urls')),

    # Other apps
    path('api/', include('tms.api_urls')),
]
