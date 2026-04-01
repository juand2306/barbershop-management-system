from rest_framework import serializers
from .models import ServiceRecord

class ServiceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRecord
        fields = '__all__'
