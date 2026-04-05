from django.contrib import admin

from .models import Trainer


@admin.register(Trainer)
class TrainerAdmin(admin.ModelAdmin):
    list_display = ("user", "batch")
    list_select_related = ("user", "batch")
    search_fields = ("user__username", "user__email", "batch__name")
