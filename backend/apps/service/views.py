from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Service
from .serializers import ServiceSerializer
from apps.core.permissions import IsAdminOrManager
from django.utils import timezone


class ServiceViewSet(viewsets.ModelViewSet):
    """
    CRUD completo del catalogo de servicios de la barberia.
    Soft-delete: Servicios se marcan como inactive en lugar de eliminarse.
    """
    serializer_class = ServiceSerializer
    
    def get_permissions(self):
        """
        Lectura: AllowAny (para portal público de reservas)
        Modificación (POST/PUT/DELETE): IsAdminOrManager solo
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [IsAdminOrManager]
            
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Filtrar por barbershop si está autenticado.
        Para acceso público, retornar todos los activos.
        """
        qs = Service.objects.all()

        if self.request.user and self.request.user.is_authenticated:
            qs = qs.filter(barbershop=self.request.user.barbershop)
        else:
            # Para acceso público, solo mostrar servicios activos
            qs = qs.filter(active=True)
        
        # Filtros
        category = self.request.query_params.get('category')
        active = self.request.query_params.get('active')

        if category:
            qs = qs.filter(category=category)
        if active is not None:
             active_bool = active.lower() in ['true', '1', 'yes']
             qs = qs.filter(active=active_bool)

        return qs.order_by('name')

    def perform_create(self, serializer):
        serializer.save(barbershop=self.request.user.barbershop)

    def perform_destroy(self, instance):
        """
        Soft-delete: Marcar como inactive en lugar de eliminar.
        Prevenir eliminación de servicios con citas activas/próximas.
        """
        from apps.appointment.models import Appointment
        
        # Verificar si hay citas activas/confirmadas/próximas para este servicio
        pending_appointments = Appointment.objects.filter(
            service=instance,
            appointment_datetime__gte=timezone.now(),
            status__in=['confirmada', 'pendiente']
        ).exists()
        
        if pending_appointments:
            raise status.HTTP_400_BAD_REQUEST({
                "error": "No se puede eliminar servicio con citas activas. Cancélalas primero."
            })
        
        # Si no hay citas conflictivas, marcar como inactivo
        instance.active = False
        instance.save()
        
        return Response(
            {'status': 'Servicio desactivado correctamente'},
            status=status.HTTP_200_OK
        )
