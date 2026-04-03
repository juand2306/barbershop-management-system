from django.db import models
from django.core.validators import MinValueValidator


class Expense(models.Model):
    """
    Gasto de la barberia en un dia.

    Los gastos reducen el efectivo disponible en caja y se reflejan
    en el cierre diario como egresos por metodo de pago.
    """

    CATEGORY_CHOICES = [
        ('compras', 'Compras / Insumos'),
        ('servicios', 'Servicios Externos'),
        ('mantenimiento', 'Mantenimiento'),
        ('nomina', 'Nomina / Personal'),
        ('arriendo', 'Arriendo'),
        ('publicidad', 'Publicidad'),
        ('otro', 'Otro'),
    ]

    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='expenses'
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Monto'
    )
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='otro',
        verbose_name='Categoria'
    )
    detail = models.TextField(verbose_name='Detalle / descripcion')

    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses',
        verbose_name='Metodo de pago'
    )

    # Permite registrar el gasto en su fecha real (no siempre la de registro)
    expense_date = models.DateField(
        verbose_name='Fecha del gasto',
        help_text='Fecha en que ocurrio el gasto'
    )

    registered_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses_registered',
        verbose_name='Registrado por'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Gasto'
        verbose_name_plural = 'Gastos'
        ordering = ['-expense_date', '-created_at']
        indexes = [
            models.Index(fields=['barbershop', 'expense_date']),
        ]

    def __str__(self):
        return f"{self.get_category_display()} | ${self.amount:,.0f} | {self.expense_date}"
