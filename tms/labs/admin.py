from django.contrib import admin

from .models import Lab


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = ("name", "batch", "trainer")
    list_select_related = ("batch", "trainer", "trainer__user")
    search_fields = ("name", "batch__name", "trainer__user__username")
