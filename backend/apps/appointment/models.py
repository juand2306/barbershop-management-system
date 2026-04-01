from django.db import models

class Appointment(models.Model):
    """Cita agendada."""
    
    STATUS_CHOICES = [
        ('confirmada', 'Confirmada'),
        ('pendiente', 'Pendiente Confirmación'),
        ('cancelada', 'Cancelada'),
        ('no_asistio', 'No Asistió'),
        ('completada', 'Completada'),
    ]
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    barber = models.ForeignKey(
        'barber.Barber',
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    service = models.ForeignKey(
        'service.Service',
        on_delete=models.SET_NULL,
        null=True
    )
    
    client_name = models.CharField(max_length=200)
    client_phone = models.CharField(max_length=20)
    client_email = models.EmailField(blank=True, null=True)
    
    appointment_datetime = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendiente'
    )
    notes = models.TextField(blank=True, null=True)
    
    is_online_booking = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Cita"
        verbose_name_plural = "Citas"
        indexes = [
            models.Index(fields=['barbershop', 'appointment_datetime']),
            models.Index(fields=['barber', 'appointment_datetime']),
        ]
    
    def __str__(self):
        return f"{self.client_name} - {self.appointment_datetime}"
