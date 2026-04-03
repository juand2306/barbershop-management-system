from rest_framework import serializers
from .models import Barber, BarberDailyActive
import datetime


class BarberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barber
        fields = (
            'id', 'barbershop', 'name', 'phone', 'document_id', 'specialty',
            'commission_percentage', 'active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'created_at', 'updated_at')


class BarberDailyActiveSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='barber.name', read_only=True)

    class Meta:
        model = BarberDailyActive
        fields = (
            'id', 'barber', 'barber_name', 'barbershop', 'work_date',
            'entry_time', 'exit_time', 'is_active', 'created_at'
        )
        read_only_fields = ('id', 'barbershop', 'created_at')

    def validate(self, data):
        """
        No permitir mas de un registro de actividad por barbero en el mismo dia.
        Aunque el unique_together protege a nivel de base de datos, 
        esta validacion captura el error para enviar un 400 limpio.
        """
        barber = data.get('barber')
        work_date = data.get('work_date', datetime.date.today())
        
        # Validar unicamente si estamos creando (no hay id en instance)
        if not self.instance:
            pass # UniqueValidator puede no estar configurado, asi que revisaremos manualmente.
            exists = BarberDailyActive.objects.filter(
                barber=barber, work_date=work_date
            ).exists()
            if exists:
                raise serializers.ValidationError({
                    "work_date": f"El barbero ya tiene registro de actividad para la fecha {work_date}."
                })

        return data
