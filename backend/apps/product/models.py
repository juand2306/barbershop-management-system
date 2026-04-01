from django.db import models
from django.core.validators import MinValueValidator

class Product(models.Model):
    """Producto en inventario."""
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='products'
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    current_quantity = models.IntegerField(default=0)
    minimum_quantity = models.IntegerField(default=5)
    
    supplier = models.CharField(max_length=200, blank=True)
    image_url = models.URLField(blank=True, null=True)
    
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
    
    def __str__(self):
        return f"{self.name} (Stock: {self.current_quantity})"
    
    @property
    def is_low_stock(self):
        return self.current_quantity <= self.minimum_quantity


class ProductSale(models.Model):
    """Venta de producto."""
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE
    )
    product = models.ForeignKey(
        'Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sales'
    )
    
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True
    )
    
    sale_datetime = models.DateTimeField(auto_now_add=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Venta de Producto"
        verbose_name_plural = "Ventas de Productos"
        indexes = [
            models.Index(fields=['barbershop', 'sale_datetime']),
        ]
    
    def save(self, *args, **kwargs):
        """Calcular total y deducir inventario."""
        self.total_price = self.quantity * self.unit_price - self.discount_amount
        super().save(*args, **kwargs)
        
        # Deducir del inventario
        if self.product:
            self.product.current_quantity -= self.quantity
            self.product.save()
    
    def __str__(self):
        return f"Venta {self.product.name} - {self.sale_datetime}"
