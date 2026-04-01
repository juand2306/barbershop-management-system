from django.db import models
from django.core.validators import MinValueValidator

class Barbershop(models.Model):
    """Información general de la barbería (única por instancia)."""
    
    name = models.CharField(max_length=200)
    nit = models.CharField(max_length=20, unique=True)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    description = models.TextField(blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)
    
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    slot_duration_minutes = models.IntegerField(default=30)
    default_commission_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=50.00
    )
    currency = models.CharField(max_length=3, default='COP')
    
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Barbería"
        verbose_name_plural = "Barberías"
    
    def __str__(self):
        return self.name
