from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceRecordViewSet

router = DefaultRouter()
router.register(r'', ServiceRecordViewSet, basename='service-record')

app_name = 'service_record'

urlpatterns = [
    path('', include(router.urls)),
]
