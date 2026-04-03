from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BarberViewSet, BarberDailyActiveViewSet

router = DefaultRouter()
router.register(r'daily-active', BarberDailyActiveViewSet, basename='barber-daily-active')
router.register(r'', BarberViewSet, basename='barber')

app_name = 'barber'

urlpatterns = [
    path('', include(router.urls)),
]
