from rest_framework import serializers
from .models import Appointment
from django.utils import timezone
import datetime


class AppointmentSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = (
            'id', 'barbershop', 'barber', 'barber_name', 'service', 'service_name',
            'client_name', 'client_phone', 'client_email',
            'appointment_datetime', 'status', 'status_display', 'notes',
            'is_online_booking', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'is_online_booking', 'created_at', 'updated_at')

    def validate_appointment_datetime(self, value):
        """No agendar citas en el pasado, salvo que un admin/receptionist lo fuerce activamente."""
        if value < timezone.now() - datetime.timedelta(minutes=5): # Permite un margen de 5 min
             # Aqui podriamos revisar el request context para omitir si es admin,
             # pero en general no se deben guardar citas hacia atras, deberia ser service_record.
             raise serializers.ValidationError("No se puede agendar una cita en el pasado.")
        return value
