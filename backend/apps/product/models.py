from django.db import models
from django.core.validators import MinValueValidator


class Product(models.Model):
    """Producto en inventario."""

    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='products'
    )

    name = models.CharField(max_length=200, verbose_name='Nombre')
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name='Precio de venta'
    )
    cost_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Precio de costo'
    )

    current_quantity = models.IntegerField(default=0, verbose_name='Stock actual')
    minimum_quantity = models.IntegerField(
        default=5,
        verbose_name='Stock minimo',
        help_text='Alerta de stock bajo cuando llega a este nivel'
    )

    supplier = models.CharField(max_length=200, blank=True, verbose_name='Proveedor')
    image_url = models.URLField(blank=True, null=True)

    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (Stock: {self.current_quantity})"

    @property
    def is_low_stock(self):
        return self.current_quantity <= self.minimum_quantity

    @property
    def profit_margin(self):
        """Margen de ganancia en porcentaje."""
        if self.cost_price and self.cost_price > 0:
            return round(((self.price - self.cost_price) / self.cost_price) * 100, 2)
        return None


class ProductSale(models.Model):
    """Venta de un producto."""

    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='product_sales'
    )
    product = models.ForeignKey(
        'Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sales'
    )
    barber = models.ForeignKey(
        'barber.Barber',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='product_sales',
        verbose_name='Vendedor de productos (Opcional)'
    )

    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        related_name='product_sales'
    )

    # Permite editar la fecha si se registro despues de ocurrir el evento
    sale_date = models.DateField(
        default=timezone.now,
        verbose_name='Fecha de la venta',
        help_text='Fecha real de la venta'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Venta de Producto'
        verbose_name_plural = 'Ventas de Productos'
        indexes = [
            models.Index(fields=['barbershop', 'sale_date']),
        ]

    def save(self, *args, **kwargs):
        """
        Calcular total y descontar inventario.
        BUG FIX: Solo descuenta inventario en CREACION, no en edicion.
        """
        is_new = self._state.adding  # True solo en la primera vez que se guarda

        self.total_price = (self.quantity * self.unit_price) - self.discount_amount
        if self.total_price < 0:
            self.total_price = 0

        super().save(*args, **kwargs)

        # Descontar del inventario SOLO en creacion
        if is_new and self.product:
            self.product.current_quantity -= self.quantity
            # Evitar stock negativo (puede quedar en 0 pero no menor)
            if self.product.current_quantity < 0:
                self.product.current_quantity = 0
            self.product.save(update_fields=['current_quantity'])

    def __str__(self):
        product_name = self.product.name if self.product else 'Producto eliminado'
        return f"Venta {product_name} x{self.quantity} | {self.sale_date}"
