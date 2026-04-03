from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from .serializers import UserSerializer, UserCreateSerializer, ChangePasswordSerializer
from apps.core.permissions import IsAdminOrManager, IsAdminUser

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    Gestión de Usuarios del Sistema.
    """
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        """
        Todos los usuarios autenticados pueden ver 'me' y cambiar password.
        Solo Admins y Managers pueden listar y crear nuevos usuarios.
        El Admin puede hacer delete y cambiar roles a admin.
        """
        if self.action in ['me', 'cambiar_password']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'destroy':
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAdminOrManager]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Garantiza que el usuario solo puede listar/ver a usuarios de su misma barbería.
        Si es SuperAdmin (is_superuser real), ve a todos.
        """
        if self.request.user.is_superuser:
            return User.objects.all()
        return User.objects.filter(barbershop=self.request.user.barbershop)

    def perform_create(self, serializer):
        """
        Asigna la barbería actual al nuevo usuario creado.
        """
        # Proteccion extra: un manager no puede crear admins.
        role = serializer.validated_data.get('role')
        if role == 'admin' and self.request.user.role != 'admin':
            role = 'manager' # Fallback seguro
            serializer.validated_data['role'] = role

        serializer.save(barbershop=self.request.user.barbershop)

    def perform_update(self, serializer):
        """
        Protección en update similar.
        """
        if 'role' in serializer.validated_data and serializer.validated_data['role'] == 'admin' and self.request.user.role != 'admin':
             # Remover el rol del update data o forzar manager
             serializer.validated_data.pop('role', None)
             
        serializer.save()


    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Retorna la información del usuario autenticado actual.
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='cambiar-password')
    def cambiar_password(self, request):
        """
        Cambia la contraseña del propio usuario.
        """
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)

        if serializer.is_valid():
            if not check_password(serializer.validated_data.get("old_password"), user.password):
                return Response({"old_password": ["Contraseña actual incorrecta."]}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(serializer.validated_data.get("new_password"))
            user.save()
            return Response({"status": "Contraseña actualizada exitosamente"})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
