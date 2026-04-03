from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DailyReportViewSet

router = DefaultRouter()
router.register(r'', DailyReportViewSet, basename='report')

app_name = 'report'

urlpatterns = [
    path('', include(router.urls)),
]
