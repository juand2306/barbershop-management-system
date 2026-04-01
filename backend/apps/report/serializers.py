from rest_framework import serializers
from .models import DailyReport, BarberDailyCommission

class DailyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyReport
        fields = '__all__'

class BarberDailyCommissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberDailyCommission
        fields = '__all__'
