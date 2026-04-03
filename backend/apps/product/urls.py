from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ProductSaleViewSet

router = DefaultRouter()
router.register(r'sales', ProductSaleViewSet, basename='product-sale')
router.register(r'', ProductViewSet, basename='product')

app_name = 'product'

urlpatterns = [
    path('', include(router.urls)),
]
