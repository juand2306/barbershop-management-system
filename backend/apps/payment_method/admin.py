from django.contrib import admin
from .models import PaymentMethod


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_cash', 'active', 'barbershop')
    list_filter = ('barbershop', 'is_cash', 'active')
    search_fields = ('name', 'code')
