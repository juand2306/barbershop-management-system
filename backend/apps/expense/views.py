from rest_framework import viewsets, permissions
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD de gastos de la barberia.
    Filtrado por fecha y categoria.
    """
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Expense.objects.select_related(
            'barbershop', 'payment_method', 'registered_by'
        ).filter(barbershop=self.request.user.barbershop)

        # Filtros opcionales via query params
        date = self.request.query_params.get('date')
        category = self.request.query_params.get('category')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if date:
            qs = qs.filter(expense_date=date)
        if category:
            qs = qs.filter(category=category)
        if date_from:
            qs = qs.filter(expense_date__gte=date_from)
        if date_to:
            qs = qs.filter(expense_date__lte=date_to)

        return qs

    def perform_create(self, serializer):
        serializer.save(
            barbershop=self.request.user.barbershop,
            registered_by=self.request.user
        )
