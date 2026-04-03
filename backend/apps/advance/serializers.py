from rest_framework import serializers
from .models import Advance, AdvancePayment


class AdvancePaymentSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    registered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AdvancePayment
        fields = [
            'id', 'barbershop', 'advance', 'barber',
            'amount', 'payment_method', 'payment_method_name',
            'notes', 'payment_date', 'registered_by', 'registered_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'barbershop', 'barber', 'registered_by', 'created_at']

    def get_registered_by_name(self, obj):
        if obj.registered_by:
            return obj.registered_by.get_full_name() or obj.registered_by.username
        return None


class AdvanceSerializer(serializers.ModelSerializer):
    payments = AdvancePaymentSerializer(many=True, read_only=True)
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    amount_pending = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Advance
        fields = [
            'id', 'barbershop', 'barber', 'barber_name',
            'amount', 'amount_paid', 'amount_pending',
            'payment_method', 'payment_method_name',
            'detail', 'status', 'status_display',
            'registered_by', 'payments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'barbershop', 'registered_by', 'amount_paid', 'status', 'created_at', 'updated_at']
