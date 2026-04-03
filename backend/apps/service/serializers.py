from rest_framework import serializers
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Service
        fields = (
            'id', 'barbershop', 'name', 'description', 'price', 
            'duration_minutes', 'category', 'category_display', 
            'image_url', 'active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'created_at', 'updated_at')

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("La duracion debe ser mayor a 0 minutos.")
        return value
