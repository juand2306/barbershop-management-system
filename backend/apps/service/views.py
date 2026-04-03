from rest_framework import viewsets, permissions
from .models import Service
from .serializers import ServiceSerializer
from apps.core.permissions import IsAdminOrManager


class ServiceViewSet(viewsets.ModelViewSet):
    """
    CRUD completo del catalogo de servicios de la barberia.
    """
    serializer_class = ServiceSerializer
    
    def get_permissions(self):
        """
        Lectura: Publico (Para mostrar servicios a clientes en un portal online)
                 o Autenticado para uso interno.
        Modificacion: Admin o Manager.
        """
        if self.action in ['list', 'retrieve']:
            # Permitir AllowAny facilita montar la web publica de reservas luego.
            # En modo "barberia local" (sin portal) podría ser IsAuthenticated. 
            # Por ahora, abrimos la lectura publica de servicios.
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [IsAdminOrManager]
            
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # Si no esta autenticado, asume que es trafico web publico
        # Obtenemos TODOS los servicios si no hay token.
        # (Esto funciona en un esquema Multi-tenant si filtras por barbershop ID en la url,
        # pero para single-tenant simplemente retornamos todo lo de la unica BD)
        qs = Service.objects.all()

        if self.request.user and self.request.user.is_authenticated:
            qs = qs.filter(barbershop=self.request.user.barbershop)
        
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
