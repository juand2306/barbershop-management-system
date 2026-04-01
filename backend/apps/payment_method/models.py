from django.db import models
from django.core.validators import MinValueValidator
import datetime

# ADVANCE MODEL
class Advance(models.Model):
    """Vale/adelanto a barbero - SIN descuento automático."""
    
    STATUS_CHOICES = [
        ('pendiente', 'Pendiente de Descuento'),
        ('descontado', 'Descontado'),
        ('cancelado', 'Cancelado'),
    ]
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE
    )
    barber = models.ForeignKey(
        'barber.Barber',
        on_delete=models.CASCADE,
        related_name='advances'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True
    )
    
    detail = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendiente'
    )
    
    # Tracking de descuento
    discounted_date = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha en que se descontó del pago"
    )
    discounted_by = models.ForeignKey(
        'users.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='advances_discounted'
    )
    
    advance_datetime = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Vale"
        verbose_name_plural = "Vales"
    
    def __str__(self):
        return f"Vale {self.barber.name} - {self.amount} ({self.status})"
    
    def mark_as_discounted(self, user):
        """Marcar vale como descontado."""
        self.status = 'descontado'
        self.discounted_date = datetime.date.today()
        self.discounted_by = user
        self.save()


# EXPENSE MODEL
class Expense(models.Model):
    """Gasto de la barbería."""
    
    CATEGORY_CHOICES = [
        ('compras', 'Compras'),
        ('servicios', 'Servicios Externos'),
        ('mantenimiento', 'Mantenimiento'),
        ('otro', 'Otro'),
    ]
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='otro'
    )
    detail = models.TextField()
    
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True
    )
    
    expense_datetime = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Gasto"
        verbose_name_plural = "Gastos"
        indexes = [
            models.Index(fields=['barbershop', 'expense_datetime']),
        ]
    
    def __str__(self):
        return f"{self.category} - {self.amount}"


# PAYMENT METHOD MODEL
class PaymentMethod(models.Model):
    """Medios de pago disponibles."""
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Medio de Pago"
        verbose_name_plural = "Medios de Pago"
        unique_together = ('barbershop', 'code')
    
    def __str__(self):
        return self.name
