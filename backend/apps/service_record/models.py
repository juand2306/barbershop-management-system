from django.db import models
from django.core.validators import MinValueValidator

class ServiceRecord(models.Model):
    """Servicio realizado y registrado (ingreso)."""
    
    STATUS_CHOICES = [
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
        ('pendiente', 'Pendiente'),
    ]
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='service_records'
    )
    barber = models.ForeignKey(
        'barber.Barber',
        on_delete=models.SET_NULL,
        null=True,
        related_name='service_records'
    )
    service = models.ForeignKey(
        'service.Service',
        on_delete=models.SET_NULL,
        null=True
    )
    appointment = models.OneToOneField(
        'appointment.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='service_record'
    )
    
    price_charged = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True
    )
    
    service_datetime = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='completada'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Registro de Servicio"
        verbose_name_plural = "Registros de Servicio"
        indexes = [
            models.Index(fields=['barbershop', 'service_datetime']),
            models.Index(fields=['barber', 'service_datetime']),
        ]
    
    def __str__(self):
        return f"Servicio {self.barber.name} - {self.service_datetime}"
