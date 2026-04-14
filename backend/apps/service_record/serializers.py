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
        El barbero debe tener un registro activo para la fecha del servicio.

        Regla especial para cobros de citas (appointment vinculado):
        - El barbero debe tener turno activo HOY (fecha en que se está cobrando),
          independientemente de la hora de la cita agendada.
        - Para walk-ins sin appointment, se valida la fecha del service_datetime.
        """
        barber = data.get('barber')
        if not barber:
            return data

        from django.utils import timezone

        service_datetime = data.get('service_datetime', timezone.now())
        service_date = timezone.localtime(service_datetime).date() if isinstance(service_datetime, datetime.datetime) else service_datetime

        # Solo validar turno activo si se está creando el registro (no editando)
        if not self.instance:
            # Si viene con una appointment vinculada, usamos HOY como fecha de validación
            # (el pago siempre ocurre el día actual, no el día de la cita agendada)
            appointment = data.get('appointment')
            validate_date = timezone.localtime().date() if appointment else service_date

            active_log = BarberDailyActive.objects.filter(
                barber=barber,
                work_date=validate_date,
                is_active=True
            ).exists()

            if not active_log:
                if appointment:
                    raise serializers.ValidationError({
                        "barber": (
                            f"Para registrar el cobro de esta cita, {barber.name} debe tener "
                            f"el turno abierto hoy ({validate_date}). "
                            f"Ve a Equipo → marcá la entrada del barbero primero."
                        )
                    })
                else:
                    raise serializers.ValidationError({
                        "barber": (
                            f"{barber.name} no tiene un registro de actividad activo "
                            f"para el {service_date}."
                        )
                    })

        return data

    def validate_price_charged(self, value):
        if value < 0:
             raise serializers.ValidationError("El precio cobrado no puede ser negativo.")
        return value
