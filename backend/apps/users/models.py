from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Usuario customizado del sistema.

    Roles:
    - admin: Acceso total (dueno o administrador de la barberia)
    - manager: Gestion operativa sin acceso a configuracion critica
    - receptionist: Registro de citas y servicios
    - barber: Vista de su propio perfil y estadisticas
    """

    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('manager', 'Gerente'),
        ('receptionist', 'Recepcionista'),
        ('barber', 'Barbero'),
    ]

    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.SET_NULL,  # SET_NULL para no perder el usuario si se borra la barberia
        related_name='users',
        null=True,      # Nullable para permitir superadmin sin barberia (bootstrap inicial)
        blank=True,
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='receptionist'
    )

    phone = models.CharField(max_length=20, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.get_full_name() or self.username} [{self.role}]"

    @property
    def is_admin_or_manager(self):
        return self.role in ('admin', 'manager')
