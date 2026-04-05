from django.contrib import admin

from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = (
        "certificate_name",
        "student",
        "batch",
        "voucher_code",
        "issued_at",
    )
    list_filter = ("batch", "issued_at")
    list_select_related = ("student", "batch")
    search_fields = (
        "certificate_name",
        "voucher_code",
        "student__name",
        "student__email",
        "batch__name",
    )
    readonly_fields = ("issued_at",)
