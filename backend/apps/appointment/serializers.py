from rest_framework import serializers
from .models import Appointment
from django.utils import timezone
import datetime


class AppointmentSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_duration_minutes = serializers.IntegerField(source='service.duration_minutes', read_only=True)
    # Price from the service catalog (to pre-fill the cobro modal)
    service_price = serializers.DecimalField(
        source='service.price', max_digits=10, decimal_places=0, read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    # True if this appointment already has a ServiceRecord (was already charged)
    has_service_record = serializers.SerializerMethodField()

    def get_has_service_record(self, obj):
        # Uses the reverse OneToOneField relation 'service_record'
        return hasattr(obj, 'service_record') and obj.service_record is not None

    class Meta:
        model = Appointment
        fields = (
            'id', 'barbershop', 'barber', 'barber_name', 'service', 'service_name',
            'service_duration_minutes', 'service_price',
            'client_name', 'client_phone', 'client_email',
            'appointment_datetime', 'status', 'status_display', 'notes',
            'is_online_booking', 'has_service_record', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'is_online_booking', 'created_at', 'updated_at')

    def validate_appointment_datetime(self, value):
        """
        Validación de fecha: Los bookings online no pueden ser en el pasado.
        El staff interno (receptionist/admin) SÍ puede agendar en cualquier horario,
        ya que pueden necesitar registrar citas retroactivas o del mismo día ya transcurrido.
        """
        request = self.context.get('request')
        # Si es booking online (sin token de usuario autenticado) => no permitir pasado
        is_internal = request and request.user and request.user.is_authenticated
        if not is_internal:
            if value < timezone.now() - datetime.timedelta(minutes=5):
                raise serializers.ValidationError("No se puede agendar una cita en el pasado.")
        return value
