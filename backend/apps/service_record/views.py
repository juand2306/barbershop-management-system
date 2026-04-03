from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone

from .models import ServiceRecord
from .serializers import ServiceRecordSerializer
from apps.core.permissions import IsAdminOrManager, IsReceptionistOrHigher


class ServiceRecordViewSet(viewsets.ModelViewSet):
    """
    CRUD para los registros de servicios cobrados.
    Genera el ingreso principal de caja.
    """
    serializer_class = ServiceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Un barbero normal podria querer ver su propio historial:
        if self.request.user.role == 'barber':
             # Hay que buscar el modelo Barber vinculado. 
             # Suponiendo que el User model tiene relacion al Barber o se usa filtrado comun.
             # Por seguridad base de Single Tenant, los filtros del cliente haran su trabajo 'barber_id='
             qs = ServiceRecord.objects.select_related('barber', 'service', 'payment_method', 'appointment').filter(
                 barbershop=self.request.user.barbershop
             )
        else:
             qs = ServiceRecord.objects.select_related('barber', 'service', 'payment_method', 'appointment').filter(
                 barbershop=self.request.user.barbershop
             )
        
        # Filtros
        date = self.request.query_params.get('date')          # YYYY-MM-DD
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        barber = self.request.query_params.get('barber')
        status_filter = self.request.query_params.get('status')
        payment_method = self.request.query_params.get('payment_method')

        if date:
             qs = qs.filter(service_datetime__date=date)
        if date_from:
             qs = qs.filter(service_datetime__date__gte=date_from)
        if date_to:
             qs = qs.filter(service_datetime__date__lte=date_to)
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

    @action(detail=False, methods=['get'], url_path='resumen-hoy')
    def resumen_hoy(self, request):
        """
        Retorna los totales cobrados del dia para un vistazo rapido en el dashboard.
        """
        today = timezone.localtime().date()
        date_param = request.query_params.get('date')
        if date_param:
             import datetime
             try:
                  today = datetime.datetime.strptime(date_param, '%Y-%m-%d').date()
             except ValueError:
                  pass

        qs = ServiceRecord.objects.filter(
             barbershop=request.user.barbershop,
             service_datetime__date=today,
             status='completado' # Solo cobrados reales
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
