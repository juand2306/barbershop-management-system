from rest_framework import serializers
from .models import Barbershop


class BarbershopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barbershop
        fields = (
            'id', 'name', 'nit', 'address', 'phone', 'email', 'description', 
            'logo_url', 'opening_time', 'closing_time', 'slot_duration_minutes', 
            'default_commission_percentage', 'currency', 'active', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
