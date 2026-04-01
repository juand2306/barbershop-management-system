from rest_framework import serializers
from .models import Advance, Expense, PaymentMethod

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'

class AdvanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Advance
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
