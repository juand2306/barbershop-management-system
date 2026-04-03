from django.contrib import admin
from .models import DailyReport, DailyReportPaymentBreakdown, BarberDailyCommission


class DailyReportPaymentBreakdownInline(admin.TabularInline):
    model = DailyReportPaymentBreakdown
    extra = 0
    readonly_fields = ('expected_amount',)

    @admin.display(description='Esperado')
    def expected_amount(self, obj):
        return f"${obj.expected_amount:,.0f}"


class BarberDailyCommissionInline(admin.TabularInline):
    model = BarberDailyCommission
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(DailyReport)
class DailyReportAdmin(admin.ModelAdmin):
    list_display = (
        'report_date', 'barbershop', 'status',
        'total_services_amount', 'total_advances_given',
        'total_advance_payments', 'barber_commission_total', 'barbershop_profit'
    )
    list_filter = ('barbershop', 'status', 'report_date')
    date_hierarchy = 'report_date'
    readonly_fields = ('created_at', 'updated_at')
    inlines = [DailyReportPaymentBreakdownInline, BarberDailyCommissionInline]


@admin.register(BarberDailyCommission)
class BarberDailyCommissionAdmin(admin.ModelAdmin):
    list_display = ('barber', 'commission_date', 'services_total', 'commission_percentage', 'commission_amount', 'pending_advances_total')
    list_filter = ('barbershop', 'commission_date')
    date_hierarchy = 'commission_date'
