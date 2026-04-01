from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """Usuario customizado."""
    
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('manager', 'Gerente'),
        ('receptionist', 'Recepcionista'),
        ('barber', 'Barbero'),
    ]
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='users'
    )
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='receptionist'
    )
    
    phone = models.CharField(max_length=20, blank=True)
    active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
    
    def __str__(self):
        return f"{self.get_full_name()} - {self.role}"
