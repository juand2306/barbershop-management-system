from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdvanceViewSet, AdvancePaymentViewSet

router = DefaultRouter()
router.register(r'', AdvanceViewSet, basename='advance')
router.register(r'payments', AdvancePaymentViewSet, basename='advance-payment')

app_name = 'advance'

urlpatterns = [
    path('', include(router.urls)),
]
