from rest_framework import viewsets, permissions
from .models import PaymentMethod
from .serializers import PaymentMethodSerializer


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    CRUD de medios de pago de la barberia.
    """
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(
            barbershop=self.request.user.barbershop
        )

    def perform_create(self, serializer):
        serializer.save(barbershop=self.request.user.barbershop)
