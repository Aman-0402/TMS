"""
URL configuration for tms project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),

    # API routes - accounts app (authentication, users, etc.)
    path('api/', include('accounts.urls')),

    # API routes - students app
    path('api/', include('students.urls')),

    # API routes - other apps
    path('api/', include('tms.api_urls')),
]
