from rest_framework import permissions

def assign_default_barbershop(user):
    """
    Hook to ensure superusers without a Barbershop explicitly get one attached
    so they can interact with the app without violating NOT NULL constraints.
    """
    if user and user.is_authenticated and user.is_superuser:
        if not user.barbershop:
            from apps.barbershop.models import Barbershop
            import datetime
            b = Barbershop.objects.first()
            if not b:
                b = Barbershop.objects.create(
                    name="Synapsia Default",
                    nit="900000000-1",
                    address="Principal",
                    phone="3000000000",
                    email="admin@synapsia.local",
                    opening_time=datetime.time(8, 0),
                    closing_time=datetime.time(20, 0)
                )
            if b:
                user.barbershop = b
                user.role = 'admin'
                user.save(update_fields=['barbershop', 'role'])


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
