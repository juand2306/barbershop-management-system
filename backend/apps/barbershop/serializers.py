from rest_framework import serializers
from .models import Barbershop

class BarbershopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barbershop
        fields = '__all__'
