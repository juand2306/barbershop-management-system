from rest_framework import serializers
from .models import Appointment
from django.utils import timezone
from django.utils.timezone import localtime
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
        Bookings online: no pueden ser en el pasado (tolerancia 5 min).
        Staff interno: validación de rango máximo 30 min se hace en validate().
        """
        request = self.context.get('request')
        is_internal = request and request.user and request.user.is_authenticated
        if not is_internal:
            if value < timezone.now() - datetime.timedelta(minutes=5):
                raise serializers.ValidationError("No se puede agendar una cita en el pasado.")
        return value

    def validate(self, data):
        """
        Validaciones cruzadas:
        1. Staff interno: no más de 30 minutos en el pasado.
        2. Todos: no double-booking — el barbero no puede tener otra cita activa
           que se solape con el rango [start, start+duration).
        """
        request = self.context.get('request')

        # En actualizaciones parciales, completar con los valores actuales del objeto
        appointment_datetime = data.get('appointment_datetime')
        barber = data.get('barber')
        service = data.get('service')

        if self.instance:
            appointment_datetime = appointment_datetime or self.instance.appointment_datetime
            barber = barber or self.instance.barber
            service = service or self.instance.service

        if not appointment_datetime:
            return data

        is_internal = request and request.user and request.user.is_authenticated

        # ── 1. Límite de tiempo en el pasado para staff interno ──────────────
        if is_internal:
            limit = timezone.now() - datetime.timedelta(minutes=30)
            if appointment_datetime < limit:
                raise serializers.ValidationError({
                    'appointment_datetime': (
                        'No se puede agendar una cita con más de 30 minutos en el pasado.'
                    )
                })

        # ── 2. Verificación de disponibilidad (anti double-booking) ──────────
        if barber and service:
            duration = getattr(service, 'duration_minutes', 0)
            if duration > 0:
                new_start = appointment_datetime
                new_end = new_start + datetime.timedelta(minutes=duration)

                existing_qs = (
                    Appointment.objects
                    .filter(
                        barber=barber,
                        status__in=['pendiente', 'confirmada'],
                        service__isnull=False,
                        appointment_datetime__date=appointment_datetime.date(),
                    )
                    .select_related('service')
                )

                # Excluir la propia cita en caso de actualización
                if self.instance:
                    existing_qs = existing_qs.exclude(pk=self.instance.pk)

                for appt in existing_qs:
                    if not appt.service:
                        continue
                    existing_start = appt.appointment_datetime
                    existing_end = existing_start + datetime.timedelta(
                        minutes=appt.service.duration_minutes
                    )
                    # Dos intervalos [s1,e1) y [s2,e2) se solapan si s1 < e2 AND s2 < e1
                    if new_start < existing_end and existing_start < new_end:
                        ls = localtime(existing_start).strftime('%I:%M %p')
                        le = localtime(existing_end).strftime('%I:%M %p')
                        raise serializers.ValidationError({
                            'appointment_datetime': (
                                f'El barbero ya tiene una cita de {ls} a {le}. '
                                f'Por favor elige otro horario.'
                            )
                        })

        return data
