from rest_framework import serializers
from .models import Barber, BarberDailyActive

class BarberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barber
        fields = '__all__'

class BarberDailyActiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberDailyActive
        fields = '__all__'
