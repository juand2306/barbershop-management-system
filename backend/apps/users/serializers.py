from rest_framework import serializers
from .models import User
from apps.barbershop.models import Barbershop


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    barbershop_name = serializers.CharField(source='barbershop.name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'phone', 'active',
            'barbershop', 'barbershop_name'
        )
        read_only_fields = ('id', 'barbershop')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'phone'
        )

    def create(self, validated_data):
        # La barbería la asigna la View de forma automática
        user = User.objects.create_user(**validated_data)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
