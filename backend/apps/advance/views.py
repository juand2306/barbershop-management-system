import datetime
from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Advance, AdvancePayment
from .serializers import AdvanceSerializer, AdvancePaymentSerializer


def _day_range(target_date):
    tz = timezone.get_current_timezone()
    return (
        timezone.make_aware(datetime.datetime.combine(target_date, datetime.time.min), tz),
        timezone.make_aware(datetime.datetime.combine(target_date, datetime.time.max), tz),
    )


class AdvanceViewSet(viewsets.ModelViewSet):
    """
    CRUD de vales.
    Regla de negocio: el vale NO descuenta comisiones.
    Sale de caja el dia que se da; vuelve a caja el dia que se paga.
    """
    serializer_class = AdvanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Retornar todos los vales del rango sin cortar

    def get_queryset(self):
        qs = Advance.objects.prefetch_related('payments').select_related(
            'barber', 'payment_method', 'registered_by'
        ).filter(barbershop=self.request.user.barbershop)

        barber_id = self.request.query_params.get('barber')
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if barber_id:
            qs = qs.filter(barber_id=barber_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        # created_at es DateTimeField: usar rangos timezone-aware en vez de __date
        if date_from:
            try:
                qs = qs.filter(created_at__gte=_day_range(
                    datetime.datetime.strptime(date_from, '%Y-%m-%d').date()
                )[0])
            except ValueError:
                pass
        if date_to:
            try:
                qs = qs.filter(created_at__lte=_day_range(
                    datetime.datetime.strptime(date_to, '%Y-%m-%d').date()
                )[1])
            except ValueError:
                pass

        return qs

    def perform_create(self, serializer):
        serializer.save(
            barbershop=self.request.user.barbershop,
            registered_by=self.request.user
        )

    @action(detail=True, methods=['post'], url_path='registrar-pago')
    def registrar_pago(self, request, pk=None):
        """
        POST /api/advances/{id}/registrar-pago/
        Registra un pago parcial o total del vale.
        """
        advance = self.get_object()

        if advance.status == 'pagado':
            return Response(
                {'error': 'Este vale ya esta completamente pagado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if advance.status == 'cancelado':
            return Response(
                {'error': 'No se puede registrar pago en un vale cancelado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount = request.data.get('amount')
        if not amount:
            return Response(
                {'error': 'El campo "amount" es requerido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(amount))
        except Exception:
            return Response(
                {'error': 'El monto debe ser un numero valido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if amount <= 0:
            return Response(
                {'error': 'El monto debe ser mayor a cero.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if amount > advance.amount_pending:
            return Response(
                {'error': f'El monto excede el saldo pendiente (${advance.amount_pending:,.0f}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_data = {
            'advance': advance.id,
            'amount': amount,
            'payment_method': request.data.get('payment_method'),
            'notes': request.data.get('notes', ''),
        }

        # Solo incluir payment_date si se envia explicitamente
        payment_date = request.data.get('payment_date')
        if payment_date:
            payment_data['payment_date'] = payment_date

        serializer = AdvancePaymentSerializer(data=payment_data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(
            barbershop=request.user.barbershop,
            barber=advance.barber,          # <- FIX: barber is read_only, must pass here
            registered_by=request.user
        )

        # Refrescar el advance para retornar el estado actualizado
        advance.refresh_from_db()
        return Response(
            AdvanceSerializer(advance, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )



class AdvancePaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Listado de pagos de vales (solo lectura — se crean via /advances/{id}/registrar-pago/).
    Util para el cierre de caja del dia.
    """
    serializer_class = AdvancePaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = AdvancePayment.objects.select_related(
            'advance', 'barber', 'payment_method', 'registered_by'
        ).filter(barbershop=self.request.user.barbershop)

        date = self.request.query_params.get('date')
        barber_id = self.request.query_params.get('barber')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if date:
            qs = qs.filter(payment_date=date)
        if barber_id:
            qs = qs.filter(barber_id=barber_id)
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)

        return qs
