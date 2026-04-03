from rest_framework import serializers
from .models import ServiceRecord
from apps.barber.models import BarberDailyActive
import datetime
from django.utils import timezone


class ServiceRecordSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)

    class Meta:
        model = ServiceRecord
        fields = (
            'id', 'barbershop', 'barber', 'barber_name', 'service', 'service_name',
            'appointment', 'price_charged', 'payment_method', 'payment_method_name',
            'client_name', 'service_datetime', 'status', 'notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'created_at', 'updated_at')

    def validate(self, data):
        """
        Validación de negocio:
        El barbero asiganado debe tener un registro activo ('BarberDailyActive')
        para la fecha en que se esta registrando el servicio.
        """
        barber = data.get('barber')
        if not barber:
             return data # Podria permitirse sin barbero si es un cobro suelto, aunque el modelo tiene related_name normal.
             
        from django.utils import timezone
        
        service_datetime = data.get('service_datetime', timezone.now())
        service_date = timezone.localtime(service_datetime).date() if isinstance(service_datetime, datetime.datetime) else service_datetime

        # Verificar si el barbero reporto ingreso en esa fecha
        active_log = BarberDailyActive.objects.filter(
            barber=barber,
            work_date=service_date,
            is_active=True
        ).exists()

        if not active_log:
             # Generar un aviso o error. Como regla de negocio estricta, lanzar error.
             # Si se quiere flexibilidad, se podria quitar o volver Warning frontend.
             raise serializers.ValidationError({
                  "barber": f"El barbero {barber.name} no tiene un registro de actividad activo para la fecha {service_date}."
             })
             
        return data

    def validate_price_charged(self, value):
        if value < 0:
             raise serializers.ValidationError("El precio cobrado no puede ser negativo.")
        return value
