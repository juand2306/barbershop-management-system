from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Barbershop
from .serializers import BarbershopSerializer
from apps.core.permissions import IsAdminOrManager, IsAdminUser


class BarbershopViewSet(viewsets.ModelViewSet):
    """
    Gestion de la informacion de la barbería.
    Al ser Single Tenant, la barberia es normalmente la propia.
    """
    serializer_class = BarbershopSerializer
    
    def get_permissions(self):
        """
        Lectura: Publico o Recepcionista.
        Actualizacion: Solo Admin y Manager
        """
        if self.action in ['list', 'retrieve', 'info_publica']:
            permission_classes = [permissions.AllowAny]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAdminOrManager]
        else:
            permission_classes = [IsAdminUser] # Crear / destroy
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Solo retorna la barbería a la que pertenece el usuario.
        Para usuarios no autenticados (public), retorna la primera activa.
        """
        if self.request.user and self.request.user.is_authenticated:
            return Barbershop.objects.filter(id=self.request.user.barbershop_id)
        return Barbershop.objects.filter(active=True)

    @action(detail=False, methods=['get'], url_path='info-publica')
    def info_publica(self, request):
        """
        Endpoint público (sin autenticación) para la landing page del cliente.
        Retorna la info de la barbería + catálogo de servicios activos + barberos activos.
        """
        from apps.service.models import Service
        from apps.barber.models import Barber

        barbershop = Barbershop.objects.filter(active=True).first()
        if not barbershop:
            return Response({'error': 'Barbería no encontrada'}, status=404)

        # Servicios activos
        services = Service.objects.filter(barbershop=barbershop, active=True).values(
            'id', 'name', 'description', 'price', 'duration_minutes', 'category'
        )

        # Barberos activos
        barbers = Barber.objects.filter(barbershop=barbershop, active=True).values(
            'id', 'name', 'specialty'
        )

        return Response({
            'id': barbershop.id,
            'name': barbershop.name,
            'description': barbershop.description,
            'address': barbershop.address,
            'phone': barbershop.phone,
            'email': barbershop.email,
            'logo_url': barbershop.logo_url,
            'opening_time': str(barbershop.opening_time),
            'closing_time': str(barbershop.closing_time),
            'currency': barbershop.currency,
            'services': list(services),
            'barbers': list(barbers),
        })

