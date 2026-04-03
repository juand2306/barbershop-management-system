from django.db import models


class PaymentMethod(models.Model):
    """
    Medios de pago configurables por la barberia.
    Ejemplos: Efectivo, Nequi, Daviplata, Bancolombia, Tarjeta, etc.
    """

    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )

    name = models.CharField(max_length=100, verbose_name='Nombre')
    code = models.CharField(max_length=50, verbose_name='Codigo interno')
    # Indica si es un metodo que mueve efectivo fisico
    is_cash = models.BooleanField(
        default=False,
        help_text='True si es efectivo fisico (para el conteo de caja)',
        verbose_name='Es efectivo fisico'
    )
    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Medio de Pago'
        verbose_name_plural = 'Medios de Pago'
        unique_together = ('barbershop', 'code')
        ordering = ['name']

    def __str__(self):
        return self.name
