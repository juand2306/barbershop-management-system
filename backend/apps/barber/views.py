from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
import datetime
import cloudinary.uploader

from .models import Barber, BarberDailyActive
from .serializers import BarberSerializer, BarberDailyActiveSerializer
from apps.core.permissions import IsAdminOrManager


class BarberViewSet(viewsets.ModelViewSet):
    """
    Gestion Administrativa de Barberos.
    Permite listado, busquedas y filtrados.
    """
    serializer_class = BarberSerializer
    
    def get_permissions(self):
        """
        Todos los usuarios de la barberia pueden ver los barberos disponibles.
        Solo Admin y Manager pueden agregar o modificar perfiles de barberos.
        """
        if self.action in ['list', 'retrieve', 'activos_hoy']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsAdminOrManager]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = Barber.objects.filter(barbershop=self.request.user.barbershop)
        
        # Filtros basicos
        active = self.request.query_params.get('active', None)
        search = self.request.query_params.get('search', None)

        if active is not None:
            active_bool = active.lower() in ['true', '1', 'yes']
            qs = qs.filter(active=active_bool)

        if search:
            qs = qs.filter(name__icontains=search)

        return qs.order_by('name')

    def perform_create(self, serializer):
        serializer.save(barbershop=self.request.user.barbershop)

    @action(detail=True, methods=['post'], url_path='upload-photo',
            parser_classes=[MultiPartParser, FormParser])
    def upload_photo(self, request, pk=None):
        """
        Sube o reemplaza la foto de perfil de un barbero a Cloudinary.
        Recibe multipart/form-data con el campo 'photo'.
        """
        barber = self.get_object()
        photo_file = request.FILES.get('photo')

        if not photo_file:
            return Response({'error': 'No se proporcionó ninguna foto.'}, status=status.HTTP_400_BAD_REQUEST)

        if photo_file.size > 5 * 1024 * 1024:
            return Response({'error': 'La foto no puede superar los 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = cloudinary.uploader.upload(
                photo_file,
                folder='barbershop/barbers',
                public_id=f'barber_{barber.id}',
                overwrite=True,
                transformation=[
                    {'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face', 'quality': 'auto', 'fetch_format': 'auto'}
                ],
            )
        except Exception as e:
            return Response({'error': f'Error al subir la foto: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        barber.photo_url = result['secure_url']
        barber.save(update_fields=['photo_url'])

        return Response(BarberSerializer(barber).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='activos-hoy')
    def activos_hoy(self, request):
        """
        Retorna los barberos que han registrado ingreso hoy.
        """
        today = timezone.localtime().date()
        date_param = request.query_params.get('date')
        if date_param:
            try:
                 today = datetime.datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                 return Response({"error": "Formato de fecha invalido (esperado YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar en registros activos
        active_records = BarberDailyActive.objects.filter(
            barbershop=request.user.barbershop,
            work_date=today,
            is_active=True
        ).select_related('barber')

        serializer = BarberDailyActiveSerializer(active_records, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BarberDailyActiveViewSet(viewsets.ModelViewSet):
    """
    Gestion de ingresos y salidas diarias de barberos.
    """
    serializer_class = BarberDailyActiveSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = BarberDailyActive.objects.select_related('barber').filter(
            barbershop=self.request.user.barbershop
        )
        
        # Filtros
        date = self.request.query_params.get('date', None)
        barber = self.request.query_params.get('barber', None)
        is_active = self.request.query_params.get('is_active', None)

        if date:
            qs = qs.filter(work_date=date)
        if barber:
            qs = qs.filter(barber_id=barber)
        if is_active is not None:
            active_bool = is_active.lower() in ['true', '1', 'yes']
            qs = qs.filter(is_active=active_bool)

        return qs.order_by('-work_date', '-entry_time')

    def perform_create(self, serializer):
        work_date = serializer.validated_data.get('work_date')
        if not work_date:
             serializer.validated_data['work_date'] = timezone.localtime().date()
        
        # Set entry_time automatically
        if 'entry_time' not in serializer.validated_data or not serializer.validated_data['entry_time']:
             serializer.validated_data['entry_time'] = timezone.localtime().time()

        serializer.save(barbershop=self.request.user.barbershop)

    def perform_update(self, serializer):
        instance = serializer.instance
        is_active = serializer.validated_data.get('is_active', instance.is_active)
        
        # Si se desactiva hoy y no tiene exit_time, agregarlo.
        if not is_active and instance.is_active:
             if 'exit_time' not in serializer.validated_data:
                  serializer.validated_data['exit_time'] = timezone.localtime().time()
                  
        serializer.save()
