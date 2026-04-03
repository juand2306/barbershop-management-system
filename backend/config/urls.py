from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ─── JWT Auth ───────────────────────────────────────────
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # ─── Apps ───────────────────────────────────────────────
    path('api/barbershop/', include('apps.barbershop.urls')),
    path('api/barbers/', include('apps.barber.urls')),
    path('api/services/', include('apps.service.urls')),
    path('api/appointments/', include('apps.appointment.urls')),
    path('api/service-records/', include('apps.service_record.urls')),
    path('api/products/', include('apps.product.urls')),

    # Vales y pagos de vales
    path('api/advances/', include('apps.advance.urls')),

    # Gastos (separado de payment_method)
    path('api/expenses/', include('apps.expense.urls')),

    # Medios de pago (configuracion)
    path('api/payment-methods/', include('apps.payment_method.urls')),

    # Reportes y cierre de caja
    path('api/reports/', include('apps.report.urls')),

    # Usuarios y autenticacion
    path('api/users/', include('apps.users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
