from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Product, ProductSale
from .serializers import ProductSerializer, ProductSaleSerializer
from apps.core.permissions import IsAdminOrManager


class ProductViewSet(viewsets.ModelViewSet):
    """
    Gestion Administrativa de Inventario (Productos).
    Soft-delete: Productos se marcan como inactive en lugar de eliminarse.
    """
    serializer_class = ProductSerializer
    
    def get_permissions(self):
        """
        GET list/retrieve: IsAuthenticated (solo usuarios de la barbería)
        POST/PUT/DELETE: IsAdminOrManager
        """
        if self.action in ['list', 'retrieve', 'stock_bajo', 'get_price']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [IsAdminOrManager]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = Product.objects.filter(barbershop=self.request.user.barbershop)
        
        # Filtros
        search = self.request.query_params.get('search')
        active = self.request.query_params.get('active')

        if search:
            qs = qs.filter(name__icontains=search)
        if active is not None:
             active_bool = active.lower() in ['true', '1', 'yes']
             qs = qs.filter(active=active_bool)

        return qs.order_by('name')

    def perform_create(self, serializer):
        serializer.save(barbershop=self.request.user.barbershop)

    def perform_destroy(self, instance):
        """
        Soft-delete: Marcar como inactive.
        Prevenir eliminación de productos con stock activo.
        """
        # Validar que el producto no tiene stock > 0
        if instance.current_quantity > 0:
            raise status.HTTP_400_BAD_REQUEST({
                "error": f"No se puede eliminar producto con stock activo ({instance.current_quantity} unidades). Agota el stock primero."
            })
        
        # Si no hay stock, marcar como inactivo
        instance.active = False
        instance.save()
        
        return Response(
            {'status': 'Producto desactivado correctamente'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='stock-bajo')
    def stock_bajo(self, request):
        """
        Retorna los productos que estan igual o por debajo de su minimum_quantity.
        """
        from django.db.models import F
        productos_bajos = Product.objects.filter(
            barbershop=request.user.barbershop,
            current_quantity__lte=F('minimum_quantity'),
            active=True
        ).order_by('current_quantity')
        
        serializer = self.get_serializer(productos_bajos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='get-price')
    def get_price(self, request, pk=None):
        """
        Endpoint para obtener el precio de un producto específico.
        Usado por frontend para auto-completar unit_price al vender un producto.
        
        Retorna: {id, name, price, current_quantity, is_low_stock}
        """
        try:
            product = self.get_object()
            return Response({
                'id': product.id,
                'name': product.name,
                'price': str(product.price),
                'current_quantity': product.current_quantity,
                'is_low_stock': product.is_low_stock
            }, status=status.HTTP_200_OK)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Producto no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )


class ProductSaleViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para registrar ventas de productos.
    """
    serializer_class = ProductSaleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ProductSale.objects.select_related('product', 'barber', 'payment_method').filter(
            barbershop=self.request.user.barbershop
        )
        
        # Filtros
        date = self.request.query_params.get('date')
        barber = self.request.query_params.get('barber')
        product = self.request.query_params.get('product')

        if date:
            qs = qs.filter(sale_date=date)
        if barber:
            qs = qs.filter(barber_id=barber)
        if product:
            qs = qs.filter(product_id=product)

        return qs.order_by('-sale_date', '-created_at')

    def perform_create(self, serializer):
        # Asegurar sale_date si no se envio manualmente (soporte de ventas offline/atrasadas)
        sale_date = serializer.validated_data.get('sale_date')
        if not sale_date:
             serializer.validated_data['sale_date'] = timezone.localtime().date()
             
        serializer.save(barbershop=self.request.user.barbershop)
