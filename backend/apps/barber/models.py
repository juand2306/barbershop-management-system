from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Barber(models.Model):
    """Barbero que trabaja en la barbería."""
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop', 
        on_delete=models.CASCADE, 
        related_name='barbers'
    )
    
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    document_id = models.CharField(max_length=50, blank=True)
    
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=50.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Barbero"
        verbose_name_plural = "Barberos"
        unique_together = ('barbershop', 'document_id')
    
    def __str__(self):
        return f"{self.name} - {self.barbershop.name}"


class BarberDailyActive(models.Model):
    """Control diario de barberos activos."""
    
    barber = models.ForeignKey(
        'Barber',
        on_delete=models.CASCADE,
        related_name='daily_activities'
    )
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE
    )
    
    work_date = models.DateField()
    entry_time = models.TimeField(null=True, blank=True)
    exit_time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Barbero Activo Diario"
        verbose_name_plural = "Barberos Activos Diarios"
        unique_together = ('barber', 'work_date')
    
    def __str__(self):
        return f"{self.barber.name} - {self.work_date}"
