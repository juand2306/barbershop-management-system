from rest_framework import permissions

def assign_default_barbershop(user):
    """
    Garantiza que el superusuario tenga una Barbershop asignada para no violar
    restricciones NOT NULL. Solo toca la DB si: es superuser Y no tiene barbershop.
    La flag _barbershop_assigned evita re-entradas en el mismo ciclo de request.
    """
    # Salida rápida: solo aplica a superusuarios sin barbershop
    if not (user and user.is_authenticated and user.is_superuser):
        return
    # Si ya tiene barbershop_id (FK int), no tocar la DB
    if getattr(user, 'barbershop_id', None):
        return
    # Flag para evitar re-entradas dentro del mismo ciclo de request
    if getattr(user, '_barbershop_assigned', False):
        return

    from apps.barbershop.models import Barbershop
    import datetime

    # get_or_create evita duplicados bajo condiciones de concurrencia
    b, _ = Barbershop.objects.get_or_create(
        nit="900000000-1",
        defaults={
            'name': "Barbería Principal",
            'address': "Principal",
            'phone': "3000000000",
            'email': "admin@barberia.local",
            'opening_time': datetime.time(8, 0),
            'closing_time': datetime.time(20, 0),
        }
    )
    user.barbershop = b
    user.role = 'admin'
    user.save(update_fields=['barbershop', 'role'])
    user._barbershop_assigned = True


class IsAdminOrManager(permissions.BasePermission):
    """
    Permite acceso solo a usuarios con rol admin o manager.
    """
    def has_permission(self, request, view):
        assign_default_barbershop(request.user)
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in ['admin', 'manager'] or request.user.is_superuser)
        )


class IsAdminUser(permissions.BasePermission):
    """
    Permite acceso solo a administradores.
    """
    def has_permission(self, request, view):
        assign_default_barbershop(request.user)
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'admin' or request.user.is_superuser)
        )


class IsReceptionistOrHigher(permissions.BasePermission):
    """
    Permite acceso a recepcionista, manager y admin.
    Excluye barberos (que usualmente solo tienen acceso de lectura).
    """
    def has_permission(self, request, view):
        assign_default_barbershop(request.user)
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in ['admin', 'manager', 'receptionist'] or request.user.is_superuser)
        )
