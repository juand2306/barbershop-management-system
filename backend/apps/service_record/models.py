from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class ServiceRecord(models.Model):
    """
    Servicio realizado y registrado (ingreso de caja).

    Puede estar vinculado a una cita (Appointment) si fue reservada,
    o ser un servicio walk-in sin cita previa.
    """

    STATUS_CHOICES = [
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
        ('pendiente_pago', 'Pendiente de Pago'),
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
        validators=[MinValueValidator(0)],
        verbose_name='Precio cobrado',
        help_text='Puede diferir del precio base del servicio (descuentos, etc.)'
    )
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        related_name='service_records'
    )

    # Nombre del cliente (si aplica — puede ser walk-in anonimo)
    client_name = models.CharField(max_length=200, blank=True, verbose_name='Nombre cliente')

    # Permite editar la hora si se registro despues (ej: se olvido registrar al momento)
    service_datetime = models.DateTimeField(
        default=timezone.now,
        verbose_name='Fecha y hora del servicio',
        help_text='Por defecto la hora actual. Puede editarse si se registro tarde.'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='completado'
    )

    notes = models.TextField(blank=True, verbose_name='Notas')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro de Servicio'
        verbose_name_plural = 'Registros de Servicio'
        ordering = ['-service_datetime']
        indexes = [
            models.Index(fields=['barbershop', 'service_datetime']),
            models.Index(fields=['barber', 'service_datetime']),
        ]

    def __str__(self):
        barber_name = self.barber.name if self.barber else 'N/A'
        service_name = self.service.name if self.service else 'Servicio eliminado'
        return f"{service_name} | {barber_name} | {self.service_datetime.strftime('%Y-%m-%d %H:%M')}"
