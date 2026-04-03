from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Advance(models.Model):
    """
    Vale / adelanto de dinero a un barbero.

    Regla de negocio:
    - El vale NO descuenta comisiones del barbero en el dia que se entrega.
    - El dinero del vale SI sale de caja ese dia (queda registrado como
      'dinero faltante por vale' en el cierre).
    - Cuando el barbero paga, se crea un AdvancePayment que entra como
      'ingreso extra por pago de vale' en el cierre del dia del pago.
    """

    STATUS_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('parcialmente_pagado', 'Parcialmente Pagado'),
        ('pagado', 'Pagado'),
        ('cancelado', 'Cancelado'),
    ]

    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='advances'
    )
    barber = models.ForeignKey(
        'barber.Barber',
        on_delete=models.CASCADE,
        related_name='advances'
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Monto del vale'
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Monto pagado hasta ahora'
    )

    # Como se entrego el dinero (efectivo, nequi, etc.)
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        related_name='advances_given',
        verbose_name='Metodo con que se entrego'
    )

    detail = models.TextField(blank=True, verbose_name='Detalle / motivo')

    status = models.CharField(
        max_length=25,
        choices=STATUS_CHOICES,
        default='pendiente'
    )

    registered_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='advances_registered',
        verbose_name='Registrado por'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Vale'
        verbose_name_plural = 'Vales'
        ordering = ['-created_at']

    def __str__(self):
        return f"Vale {self.barber.name} | ${self.amount:,.0f} | {self.status}"

    @property
    def amount_pending(self):
        """Saldo pendiente por pagar."""
        return self.amount - self.amount_paid

    def update_status(self):
        """Recalcula el status segun lo que se ha pagado."""
        if self.amount_paid >= self.amount:
            self.status = 'pagado'
        elif self.amount_paid > 0:
            self.status = 'parcialmente_pagado'
        else:
            self.status = 'pendiente'
        self.save(update_fields=['status', 'amount_paid'])


class AdvancePayment(models.Model):
    """
    Pago de un vale por parte del barbero.

    Cada vez que el barbero devuelve dinero de un vale se registra aqui.
    Este monto aparece en el cierre del dia como 'Ingreso extra - Pago de vale'
    y se suma al dinero esperado del metodo de pago correspondiente.
    """

    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='advance_payments'
    )
    advance = models.ForeignKey(
        'Advance',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='Vale al que aplica'
    )
    # Denormalizado para queries mas faciles en el cierre de caja
    barber = models.ForeignKey(
        'barber.Barber',
        on_delete=models.CASCADE,
        related_name='advance_payments'
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Monto pagado'
    )

    # Como se recibio el dinero (puede ser diferente metodo al que se entrego)
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        related_name='advance_payments_received',
        verbose_name='Metodo con que se recibio'
    )

    notes = models.TextField(blank=True, verbose_name='Notas')

    # Permite registrar pagos de dias anteriores si es necesario
    payment_date = models.DateField(
        default=timezone.now,
        verbose_name='Fecha del pago'
    )

    registered_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='advance_payments_registered'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago de Vale'
        verbose_name_plural = 'Pagos de Vales'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Pago vale {self.barber.name} | ${self.amount:,.0f} | {self.payment_date}"

    def save(self, *args, **kwargs):
        """Al guardar, actualizar el monto pagado y estado del vale padre."""
        super().save(*args, **kwargs)
        advance = self.advance
        total_paid = advance.payments.aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        advance.amount_paid = total_paid
        advance.update_status()
