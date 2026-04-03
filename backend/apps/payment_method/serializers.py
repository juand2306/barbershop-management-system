from rest_framework import serializers
from .models import PaymentMethod


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ['id', 'barbershop', 'name', 'code', 'is_cash', 'active', 'created_at']
        read_only_fields = ['id', 'created_at', 'barbershop']
