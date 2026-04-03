from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Appointment
from .serializers import AppointmentSerializer
from apps.core.permissions import IsAdminOrManager, IsReceptionistOrHigher
import datetime
from django.utils import timezone


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para el manejo y recepcion de citas en la barberia.
    """
    serializer_class = AppointmentSerializer
    
    def get_permissions(self):
        """
        Publico: Consultar disponibilidad y agendar (online booking).
        Interno: Read para barberos, CRUD completo para Receptionist/Manager/Admin.
        """
        if self.action in ['disponibilidad', 'reservar_online']:
            permission_classes = [permissions.AllowAny]
        elif self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsReceptionistOrHigher]
            
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # Si no hay token, asume trafico publico (web de reservas /disponibilidad o similar)
        qs = Appointment.objects.select_related('barber', 'service')
        
        if self.request.user and self.request.user.is_authenticated:
             qs = qs.filter(barbershop=self.request.user.barbershop)
        
        # Filtros
        status_filter = self.request.query_params.get('status')
        barber = self.request.query_params.get('barber')
        date = self.request.query_params.get('date') # YYYY-MM-DD
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if barber:
            qs = qs.filter(barber_id=barber)
        if date:
            qs = qs.filter(appointment_datetime__date=date)
        if date_from:
            qs = qs.filter(appointment_datetime__date__gte=date_from)
        if date_to:
            qs = qs.filter(appointment_datetime__date__lte=date_to)

        return qs.order_by('appointment_datetime')

    def perform_create(self, serializer):
        serializer.save(barbershop=self.request.user.barbershop)

    @action(detail=False, methods=['post'], url_path='reservar')
    def reservar_online(self, request):
        """
        POST publico para clientes en la web. (Para Fase 5, portal publico)
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Se asume un Barbershop en especifico (por ser Single Tenant, se puede coger el primero o pasar el ID).
        # Implementacion simple: Tomar el barbershop por parametro o el unico activo
        from apps.barbershop.models import Barbershop
        barbershop_id = request.data.get('barbershop')
        if not barbershop_id:
             barbershop_singleton = Barbershop.objects.filter(active=True).first()
             if barbershop_singleton:
                  barbershop_id = barbershop_singleton.id
             else:
                  return Response({"error": "No barbershop active"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save(barbershop_id=barbershop_id, is_online_booking=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='estado')
    def cambiar_estado(self, request, pk=None):
        """
        Actualiza el estado de la cita. 
        Por ejemplo, pasarlo rapidamente de 'confirmada' a 'completada'.
        Solo Recepcion/Managers
        """
        appointment = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
             return Response({"error": "Estado requerido"}, status=status.HTTP_400_BAD_REQUEST)
             
        valid_choices = [c[0] for c in Appointment.STATUS_CHOICES]
        if new_status not in valid_choices:
             return Response({"error": f"Estado no valido. Opciones: {valid_choices}"}, status=status.HTTP_400_BAD_REQUEST)
             
        appointment.status = new_status
        appointment.save(update_fields=['status', 'updated_at'])
        
        return Response(self.get_serializer(appointment).data)
