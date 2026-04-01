from django.db import models

class Service(models.Model):
    """Servicio ofrecido por la barbería."""
    
    CATEGORY_CHOICES = [
        ('corte', 'Corte'),
        ('barba', 'Barba'),
        ('combo', 'Combo'),
        ('otro', 'Otro'),
    ]
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='services'
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.IntegerField()
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='corte'
    )
    image_url = models.URLField(blank=True, null=True)
    
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"
    
    def __str__(self):
        return f"{self.name} - {self.price} {self.barbershop.currency}"
