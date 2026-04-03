from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    registered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'barbershop', 'amount', 'category', 'category_display',
            'detail', 'payment_method', 'payment_method_name',
            'expense_date', 'registered_by', 'registered_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'barbershop', 'registered_by', 'created_at', 'updated_at']

    def get_registered_by_name(self, obj):
        if obj.registered_by:
            return obj.registered_by.get_full_name() or obj.registered_by.username
        return None
