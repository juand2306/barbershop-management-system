from rest_framework import serializers
from .models import ServiceRecord, ServiceRecordPaymentSplit
from apps.barber.models import BarberDailyActive
from apps.payment_method.models import PaymentMethod
import datetime
from django.utils import timezone
from decimal import Decimal


class ServiceRecordPaymentSplitSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)

    class Meta:
        model = ServiceRecordPaymentSplit
        fields = ('id', 'payment_method', 'payment_method_name', 'amount')


class PaymentSplitInputSerializer(serializers.Serializer):
    """Validador para cada ítem del array payment_splits en la creación."""
    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class ServiceRecordSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    payment_splits_detail = ServiceRecordPaymentSplitSerializer(
        source='payment_splits', many=True, read_only=True
    )
    # Campo write-only para recibir los splits desde el frontend
    payment_splits = PaymentSplitInputSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = ServiceRecord
        fields = (
            'id', 'barbershop', 'barber', 'barber_name', 'service', 'service_name',
            'appointment', 'price_charged', 'payment_method', 'payment_method_name',
            'is_mixed_payment', 'payment_splits', 'payment_splits_detail',
            'client_name', 'service_datetime', 'status', 'notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'is_mixed_payment', 'created_at', 'updated_at')

    def validate(self, data):
        """
        Validación de negocio:
        1. El barbero debe tener turno activo para la fecha del servicio.
        2. Si se envían payment_splits → pago mixto: la suma debe coincidir con price_charged
           y no se debe enviar payment_method.
        3. Si no hay splits → payment_method es obligatorio.
        """
        barber = data.get('barber')
        splits = data.get('payment_splits', [])
        payment_method = data.get('payment_method')
        price_charged = data.get('price_charged', Decimal('0'))

        # ── Validación de que el barbero pertenece a la barbería ───────────
        request = self.context.get('request')
        if barber and request and request.user.is_authenticated:
            if barber.barbershop_id != request.user.barbershop_id:
                raise serializers.ValidationError({
                    "barber": "El barbero no pertenece a esta barbería."
                })

        # ── Validación de turno activo ──────────────────────────────────────
        if barber and not self.instance:
            service_datetime = data.get('service_datetime', timezone.now())
            service_date = (
                timezone.localtime(service_datetime).date()
                if isinstance(service_datetime, datetime.datetime)
                else service_datetime
            )
            appointment = data.get('appointment')
            validate_date = timezone.localtime().date() if appointment else service_date

            active_log = BarberDailyActive.objects.filter(
                barber=barber, work_date=validate_date, is_active=True
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

        # ── Validación de pago mixto ────────────────────────────────────────
        if splits:
            if payment_method:
                raise serializers.ValidationError({
                    "payment_method": "No envíes payment_method cuando usas payment_splits (pago mixto)."
                })
            if len(splits) < 2:
                raise serializers.ValidationError({
                    "payment_splits": "El pago mixto requiere al menos 2 métodos de pago."
                })
            total_splits = sum(s['amount'] for s in splits)
            if abs(total_splits - price_charged) > Decimal('0.01'):
                raise serializers.ValidationError({
                    "payment_splits": (
                        f"La suma de los splits (${total_splits}) debe ser igual "
                        f"al precio cobrado (${price_charged})."
                    )
                })
        else:
            if not payment_method:
                raise serializers.ValidationError({
                    "payment_method": "Debes seleccionar un método de pago o usar pago mixto."
                })

        return data

    def validate_price_charged(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio cobrado no puede ser negativo.")
        return value

    def create(self, validated_data):
        splits_data = validated_data.pop('payment_splits', [])
        is_mixed = bool(splits_data)
        instance = ServiceRecord.objects.create(**validated_data, is_mixed_payment=is_mixed)
        for split in splits_data:
            ServiceRecordPaymentSplit.objects.create(
                service_record=instance,
                payment_method=split['payment_method'],
                amount=split['amount']
            )
        return instance
