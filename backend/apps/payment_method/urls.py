from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentMethodViewSet

router = DefaultRouter()
router.register(r'', PaymentMethodViewSet, basename='payment-method')

app_name = 'payment_method'

urlpatterns = [
    path('', include(router.urls)),
]
