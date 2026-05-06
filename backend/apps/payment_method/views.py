from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import PaymentMethod
from .serializers import PaymentMethodSerializer
from apps.core.permissions import IsAdminOrManager


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    CRUD de Medios de Pago de la barbería.
    Protegido: Solo Admin/Manager pueden CRUD.
    """
    serializer_class = PaymentMethodSerializer
    pagination_class = None  # Retornar todos los métodos de pago sin cortar

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
        Incluye pagos directos y splits de pagos mixtos.
        """
        from apps.service_record.models import ServiceRecord, ServiceRecordPaymentSplit
        from apps.product.models import ProductSale, ProductSalePaymentSplit
        from apps.expense.models import Expense
        from apps.advance.models import Advance, AdvancePayment

        has_transactions = (
            ServiceRecord.objects.filter(payment_method=instance).exists()
            or ServiceRecordPaymentSplit.objects.filter(payment_method=instance).exists()
            or ProductSale.objects.filter(payment_method=instance).exists()
            or ProductSalePaymentSplit.objects.filter(payment_method=instance).exists()
            or Expense.objects.filter(payment_method=instance).exists()
            or Advance.objects.filter(payment_method=instance).exists()
            or AdvancePayment.objects.filter(payment_method=instance).exists()
        )

        if has_transactions:
            raise ValidationError(
                "No se puede eliminar este método de pago porque tiene transacciones asociadas. Desactívalo en su lugar."
            )

        instance.delete()
