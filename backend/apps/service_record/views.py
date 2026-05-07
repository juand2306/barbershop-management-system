import datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone

from .models import ServiceRecord
from .serializers import ServiceRecordSerializer
from apps.core.permissions import IsAdminOrManager, IsReceptionistOrHigher


def _day_range(target_date):
    """Devuelve (day_start, day_end) en zona horaria Bogotá para un date dado."""
    tz = timezone.get_current_timezone()
    day_start = timezone.make_aware(datetime.datetime.combine(target_date, datetime.time.min), tz)
    day_end = timezone.make_aware(datetime.datetime.combine(target_date, datetime.time.max), tz)
    return day_start, day_end


class ServiceRecordViewSet(viewsets.ModelViewSet):
    """
    CRUD para los registros de servicios cobrados.
    Genera el ingreso principal de caja.
    """
    serializer_class = ServiceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # El histórico filtra por fechas; no limitar resultados

    def get_queryset(self):
        qs = ServiceRecord.objects.select_related(
            'barber', 'service', 'payment_method', 'appointment'
        ).prefetch_related(
            'payment_splits__payment_method'
        ).filter(barbershop=self.request.user.barbershop)

        # Filtros — usar rangos explícitos con timezone para service_datetime (DateTimeField)
        # para garantizar consistencia con el cierre de caja que usa la misma lógica.
        date = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        barber = self.request.query_params.get('barber')
        status_filter = self.request.query_params.get('status')
        payment_method = self.request.query_params.get('payment_method')

        if date:
            try:
                d = datetime.datetime.strptime(date, '%Y-%m-%d').date()
                day_start, day_end = _day_range(d)
                qs = qs.filter(service_datetime__gte=day_start, service_datetime__lte=day_end)
            except ValueError:
                pass
        else:
            if date_from:
                try:
                    d_from = datetime.datetime.strptime(date_from, '%Y-%m-%d').date()
                    qs = qs.filter(service_datetime__gte=_day_range(d_from)[0])
                except ValueError:
                    pass
            if date_to:
                try:
                    d_to = datetime.datetime.strptime(date_to, '%Y-%m-%d').date()
                    qs = qs.filter(service_datetime__lte=_day_range(d_to)[1])
                except ValueError:
                    pass

        if barber:
            qs = qs.filter(barber_id=barber)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if payment_method:
            qs = qs.filter(payment_method_id=payment_method)

        return qs.order_by('-service_datetime')

    def perform_create(self, serializer):
        # Asegurar ser guardado asocíado a la barberia
        # Si se vincula Cita, se marca como completada automagicamente?
        instance = serializer.save(barbershop=self.request.user.barbershop)
        
        # Side effect opcional: Si el ServiceRecord trae una appointment vinculada
        if instance.appointment and instance.appointment.status != 'completada':
             instance.appointment.status = 'completada'
             # Y si el pago esta pendiente? Eso ya queda en la logica de UI o status del record.
             instance.appointment.save(update_fields=['status'])

    @action(detail=False, methods=['get'], url_path='resumen-por-barbero')
    def resumen_por_barbero(self, request):
        """
        Totales (ingresos + servicios) agrupados por barbero para un rango de fechas.
        Agrega en DB — sin paginación — para que BarberStats siempre muestre cifras correctas.
        Si no se pasan fechas, usa los últimos 30 días para evitar full-table scans.
        """
        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')

        # Fallback: últimos 30 días (evita full table scan si el cliente no manda fechas)
        if not date_from and not date_to:
            default_from = (timezone.localtime().date() - datetime.timedelta(days=29))
            date_from = default_from.strftime('%Y-%m-%d')

        qs = ServiceRecord.objects.filter(
            barbershop=request.user.barbershop,
            status='completado',
        )
        if date_from:
            try:
                d_from = datetime.datetime.strptime(date_from, '%Y-%m-%d').date()
                qs = qs.filter(service_datetime__gte=_day_range(d_from)[0])
            except ValueError:
                pass
        if date_to:
            try:
                d_to = datetime.datetime.strptime(date_to, '%Y-%m-%d').date()
                qs = qs.filter(service_datetime__lte=_day_range(d_to)[1])
            except ValueError:
                pass

        stats = (
            qs
            .values('barber', 'barber__name', 'barber__specialty', 'barber__photo_url')
            .annotate(
                total_revenue=Sum('price_charged'),
                total_services=Count('id'),
            )
            .order_by('-total_revenue')
        )

        return Response([
            {
                'barber':      s['barber'],
                'barber_name': s['barber__name'] or f"Barbero {s['barber']}",
                'specialty':   s['barber__specialty'] or '',
                'photo_url':   s['barber__photo_url'] or '',
                # int(round()) evita artefactos de punto flotante en la conversión de Decimal
                'revenue':     int(round(s['total_revenue'] or 0)),
                'services':    s['total_services'],
            }
            for s in stats
        ])

    @action(detail=False, methods=['get'], url_path='resumen-hoy')
    def resumen_hoy(self, request):
        """
        Retorna los totales cobrados del dia para un vistazo rapido en el dashboard.
        """
        today = timezone.localtime().date()
        date_param = request.query_params.get('date')
        if date_param:
            try:
                today = datetime.datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                pass

        day_start, day_end = _day_range(today)
        qs = ServiceRecord.objects.filter(
            barbershop=request.user.barbershop,
            service_datetime__gte=day_start,
            service_datetime__lte=day_end,
            status='completado',
        )

        metrics = qs.aggregate(
             total_amount=Sum('price_charged'),
             total_services=Count('id')
        )

        return Response({
             "date": today,
             "total_amount": metrics['total_amount'] or 0,
             "total_services": metrics['total_services'] or 0
        })
