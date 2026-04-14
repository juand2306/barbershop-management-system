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
        elif self.action in ['list', 'retrieve', 'calendario']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsReceptionistOrHigher]
            
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # Si no hay token, asume trafico publico (web de reservas /disponibilidad o similar)
        qs = Appointment.objects.select_related('barber', 'service', 'service_record')

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

    @action(detail=False, methods=['get'], url_path='calendario')
    def calendario(self, request):
        """
        Retorna los eventos del calendario combinando:
        - Appointments (citas agendadas): tipo 'cita'
        - ServiceRecords completados (walk-ins y citas cobradas): tipo 'servicio'
        
        Parametros de query:
        - date: YYYY-MM-DD (un dia especifico)
        - date_from / date_to: rango de fechas (YYYY-MM-DD)
        - barber: ID del barbero (opcional para filtrar)
        
        Cada evento retorna:
        {
            "id": ..., "type": "cita"|"servicio",
            "barber_id": ..., "barber_name": ...,
            "client_name": ..., "service_name": ...,
            "duration_minutes": ...,
            "start": "ISO datetime", "end": "ISO datetime",
            "status": ..., "notes": ...,
            "source_id": ...  # ID del appointment o service_record original
        }
        """
        from apps.service_record.models import ServiceRecord
        from datetime import timedelta

        barbershop = request.user.barbershop
        date_str = request.query_params.get('date')
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')
        barber_id = request.query_params.get('barber')

        # Determinar rango de fechas a consultar
        if date_str:
            try:
                d = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                date_from = date_to = d
            except ValueError:
                return Response({"error": "Formato de fecha invalido. Use YYYY-MM-DD."}, status=400)
        elif date_from_str and date_to_str:
            try:
                date_from = datetime.datetime.strptime(date_from_str, "%Y-%m-%d").date()
                date_to = datetime.datetime.strptime(date_to_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "Formato de fecha invalido. Use YYYY-MM-DD."}, status=400)
        else:
            # Por defecto: semana actual
            today = datetime.date.today()
            date_from = today
            date_to = today

        events = []

        # --- 1. CITAS AGENDADAS (appointments) ---
        appointments_qs = Appointment.objects.select_related('barber', 'service').filter(
            barbershop=barbershop,
            appointment_datetime__date__gte=date_from,
            appointment_datetime__date__lte=date_to,
        ).exclude(status__in=['cancelada', 'no_asistio'])
        
        if barber_id:
            appointments_qs = appointments_qs.filter(barber_id=barber_id)

        for appt in appointments_qs:
            duration = appt.service.duration_minutes if appt.service else 30
            start_dt = appt.appointment_datetime
            end_dt = start_dt + timedelta(minutes=duration)
            events.append({
                "id": f"appt-{appt.id}",
                "type": "cita",
                "barber_id": appt.barber_id,
                "barber_name": appt.barber.name if appt.barber else "N/A",
                "client_name": appt.client_name,
                "service_name": appt.service.name if appt.service else "Servicio",
                "duration_minutes": duration,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "status": appt.status,
                "is_online_booking": appt.is_online_booking,
                "notes": appt.notes or "",
                "source_id": appt.id,
            })

        # --- 2. SERVICIOS COMPLETADOS (walk-ins y atendidos ya) ---
        records_qs = ServiceRecord.objects.select_related('barber', 'service').filter(
            barbershop=barbershop,
            service_datetime__date__gte=date_from,
            service_datetime__date__lte=date_to,
            status='completado',
        )

        if barber_id:
            records_qs = records_qs.filter(barber_id=barber_id)

        for record in records_qs:
            duration = record.service.duration_minutes if record.service else 30
            end_dt = record.service_datetime
            start_dt = end_dt - timedelta(minutes=duration)
            events.append({
                "id": f"record-{record.id}",
                "type": "servicio",
                "barber_id": record.barber_id,
                "barber_name": record.barber.name if record.barber else "N/A",
                "client_name": record.client_name or "Cliente Walk-in",
                "service_name": record.service.name if record.service else "Servicio",
                "duration_minutes": duration,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "status": "completado",
                "is_online_booking": False,
                "notes": record.notes or "",
                "source_id": record.id,
            })

        # Ordenar por hora de inicio
        events.sort(key=lambda e: e['start'])

        return Response({
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "events": events,
        })

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

