from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import PaymentMethod
from .serializers import PaymentMethodSerializer
from apps.core.permissions import IsAdminOrManager


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    CRUD de Medios de Pago de la barbería.
    Protegido: Solo Admin/Manager pueden CRUD.
    """
    serializer_class = PaymentMethodSerializer
    
    def get_permissions(self):
        """
        GET list/retrieve: IsAuthenticated (todos ven los métodos de pago)
        POST/PUT/DELETE: IsAdminOrManager (solo Admin/Manager pueden modificar)
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:  # create, update, partial_update, destroy
            permission_classes = [IsAdminOrManager]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        return PaymentMethod.objects.filter(
            barbershop=self.request.user.barbershop
        ).order_by('name')

    def perform_create(self, serializer):
        serializer.save(barbershop=self.request.user.barbershop)

    def perform_destroy(self, instance):
        """
        Prevenir eliminar métodos de pago que tienen transacciones asociadas.
        Si hay transacciones: devolver error 400.
        Si no hay transacciones: permitir eliminación.
        """
        from apps.service_record.models import ServiceRecord
        from apps.product.models import ProductSale
        from apps.expense.models import Expense
        from apps.advance.models import Advance
        
        # Verificar si hay transacciones asociadas
        has_service_records = ServiceRecord.objects.filter(payment_method=instance).exists()
        has_product_sales = ProductSale.objects.filter(payment_method=instance).exists()
        has_expenses = Expense.objects.filter(payment_method=instance).exists()
        has_advances = Advance.objects.filter(payment_method=instance).exists()
        
        if has_service_records or has_product_sales or has_expenses or has_advances:
            raise status.HTTP_400_BAD_REQUEST(
                "No se puede eliminar método de pago con transacciones. Desactívalo en su lugar."
            )
        
        # Si no hay transacciones, eliminar
        instance.delete()
