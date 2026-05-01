from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Barbershop
from .serializers import BarbershopSerializer
from apps.core.permissions import IsAdminOrManager, IsAdminUser
import cloudinary.uploader


class BarbershopViewSet(viewsets.ModelViewSet):
    """
    Gestion de la informacion de la barbería.
    Al ser Single Tenant, la barberia es normalmente la propia.
    """
    serializer_class = BarbershopSerializer

    def get_permissions(self):
        """
        Lectura: Publico o cualquier autenticado.
        Actualización y logo: Solo Admin y Manager.
        Crear / eliminar: Solo Admin.
        """
        if self.action in ['list', 'retrieve', 'info_publica']:
            permission_classes = [permissions.AllowAny]
        elif self.action in ['update', 'partial_update', 'upload_logo']:
            permission_classes = [IsAdminOrManager]
        else:
            permission_classes = [IsAdminUser]
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
            'id', 'name', 'specialty', 'photo_url'
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

    @action(detail=True, methods=['post'], url_path='upload-logo',
            parser_classes=[MultiPartParser, FormParser])
    def upload_logo(self, request, pk=None):
        """
        Sube o reemplaza el logo de la barbería a Cloudinary.
        Recibe multipart/form-data con el campo 'logo'.
        Formatos aceptados: JPG, PNG, WebP, SVG. Máximo 5 MB.
        """
        barbershop = self.get_object()
        logo_file = request.FILES.get('logo')

        if not logo_file:
            return Response({'error': 'No se proporcionó ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        if logo_file.size > 5 * 1024 * 1024:
            return Response({'error': 'El logo no puede superar los 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
        if logo_file.content_type not in allowed_types:
            return Response({'error': 'Formato no soportado. Usa JPG, PNG, WebP o SVG.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = cloudinary.uploader.upload(
                logo_file,
                folder='barbershop/logos',
                public_id=f'logo_{barbershop.id}',
                overwrite=True,
                invalidate=True,
                transformation=[
                    {'width': 800, 'height': 400, 'crop': 'limit', 'quality': 'auto', 'fetch_format': 'auto'}
                ],
            )
        except Exception as e:
            return Response({'error': f'Error al subir el logo: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

        barbershop.logo_url = result['secure_url']
        barbershop.save(update_fields=['logo_url', 'updated_at'])

        return Response({'logo_url': barbershop.logo_url}, status=status.HTTP_200_OK)

