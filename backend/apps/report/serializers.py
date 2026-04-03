from rest_framework import serializers
from .models import DailyReport, DailyReportPaymentBreakdown, BarberDailyCommission


class DailyReportPaymentBreakdownSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    is_cash = serializers.BooleanField(source='payment_method.is_cash', read_only=True)
    expected_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DailyReportPaymentBreakdown
        fields = [
            'id', 'payment_method', 'payment_method_name', 'is_cash',
            'services_amount', 'products_amount', 'advance_payments_amount',
            'expenses_amount', 'advances_given_amount',
            'expected_amount',
        ]


class BarberDailyCommissionSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='barber.name', read_only=True)

    class Meta:
        model = BarberDailyCommission
        fields = [
            'id', 'barber', 'barber_name',
            'services_total', 'commission_percentage', 'commission_amount',
            'pending_advances_total',
            'commission_date',
        ]


class DailyReportSerializer(serializers.ModelSerializer):
    payment_breakdown = DailyReportPaymentBreakdownSerializer(many=True, read_only=True)
    barber_commissions = BarberDailyCommissionSerializer(many=True, read_only=True)

    # Propiedades calculadas
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_outflow = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    expected_in_register = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DailyReport
        fields = [
            'id', 'barbershop', 'report_date', 'status', 'notes',

            # Ingresos
            'total_services_amount',
            'total_products_amount',
            'total_advance_payments',

            # Egresos
            'total_expenses',
            'total_advances_given',

            # Comisiones y utilidad
            'barber_commission_total',
            'barbershop_profit',

            # Calculados
            'total_income',
            'total_outflow',
            'expected_in_register',

            # Relaciones
            'payment_breakdown',
            'barber_commissions',

            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
