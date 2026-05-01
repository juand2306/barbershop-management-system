"""
Management command: ensure_superuser
-------------------------------------
Crea el superusuario inicial si no existe todavía.
Lee las credenciales desde variables de entorno para que no haya
contraseñas hardcodeadas en el código.

Variables de entorno requeridas (configurar en Railway):
    DJANGO_SUPERUSER_USERNAME  — ej: admin
    DJANGO_SUPERUSER_EMAIL     — ej: admin@tudominio.com
    DJANGO_SUPERUSER_PASSWORD  — ej: UnaClaveSegura123!

Si el usuario ya existe, el comando no hace nada (idempotente).
Si faltan las variables, imprime un aviso y continúa sin fallar.
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Crea el superusuario inicial desde variables de entorno si no existe.'

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.getenv('DJANGO_SUPERUSER_USERNAME')
        email    = os.getenv('DJANGO_SUPERUSER_EMAIL', '')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD')

        if not username or not password:
            self.stdout.write(self.style.WARNING(
                'ensure_superuser: DJANGO_SUPERUSER_USERNAME o DJANGO_SUPERUSER_PASSWORD '
                'no están definidas. Se omite la creación del superusuario.'
            ))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.SUCCESS(
                f'ensure_superuser: el usuario "{username}" ya existe. Nada que hacer.'
            ))
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(
            f'ensure_superuser: superusuario "{username}" creado correctamente.'
        ))
