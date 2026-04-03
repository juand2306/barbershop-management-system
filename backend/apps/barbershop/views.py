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
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAdminOrManager]
        else:
            permission_classes = [IsAdminUser] # Crear / destroy
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Solo retorna la barbería a la que pertenece el usuario.
        """
        return Barbershop.objects.filter(id=self.request.user.barbershop_id)
