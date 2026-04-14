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
        validators = [] # <- IMPORTANTE: Permite que el create() personalizado funcione.

    def create(self, validated_data):
        """
        Si ya existe un registro para este barbero en esta fecha,
        reactivarlo en lugar de crear nuevo (upsert).
        
        Esto permite que el frontend pueda hacer POST múltiples veces
        sin error de unique_together, y que el barbero pueda marcar
        entrada, salida y volver a entrar el mismo día.
        """
        import datetime as dt
        barber = validated_data.get('barber')
        work_date = validated_data.get('work_date', dt.date.today())
        barbershop = validated_data.get('barbershop')
        
        # Buscar si ya existe registro para este barbero en esta fecha
        existing = BarberDailyActive.objects.filter(
            barber=barber,
            work_date=work_date,
            barbershop=barbershop
        ).first()
        
        if existing:
            # Re-entrada: reactivar, resetear entry_time y limpiar exit_time
            existing.is_active = True
            existing.exit_time = None
            existing.entry_time = validated_data.get('entry_time', dt.datetime.now().time())
            existing.save(update_fields=['is_active', 'entry_time', 'exit_time'])
            return existing
        
        # Si no existe, crear normalmente
        return super().create(validated_data)

    def validate(self, data):
        """Validaciones de lógica de negocio"""
        entry_time = data.get('entry_time')
        exit_time = data.get('exit_time')
        
        # Validación: exit_time debe ser después de entry_time
        if entry_time and exit_time:
            if exit_time <= entry_time:
                raise serializers.ValidationError({
                    "exit_time": "La hora de salida debe ser después de la entrada."
                })
        
        return data
