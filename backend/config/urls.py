from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Apps
    path('api/barbershop/', include('apps.barbershop.urls')),
    path('api/barbers/', include('apps.barber.urls')),
    path('api/services/', include('apps.service.urls')),
    path('api/appointments/', include('apps.appointment.urls')),
    path('api/records/', include('apps.service_record.urls')),
    path('api/products/', include('apps.product.urls')),
    path('api/advances/', include('apps.advance.urls')),
    path('api/expenses/', include('apps.payment_method.urls')),
    path('api/reports/', include('apps.report.urls')),
    path('api/users/', include('apps.users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
