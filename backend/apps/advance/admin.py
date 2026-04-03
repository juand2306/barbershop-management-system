from django.contrib import admin
from .models import Advance, AdvancePayment


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ('barber', 'amount', 'amount_paid', 'amount_pending', 'status', 'payment_method', 'created_at')
    list_filter = ('barbershop', 'status', 'created_at')
    search_fields = ('barber__name', 'detail')
    readonly_fields = ('amount_paid', 'amount_pending', 'created_at', 'updated_at')
    ordering = ('-created_at',)

    @admin.display(description='Saldo pendiente')
    def amount_pending(self, obj):
        return f"${obj.amount_pending:,.0f}"


@admin.register(AdvancePayment)
class AdvancePaymentAdmin(admin.ModelAdmin):
    list_display = ('barber', 'amount', 'payment_method', 'payment_date', 'advance', 'registered_by')
    list_filter = ('barbershop', 'payment_date')
    search_fields = ('barber__name', 'notes')
    date_hierarchy = 'payment_date'
    ordering = ('-payment_date',)
