from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('job', views.JobViewSet)
router.register('pipeline', views.PipelineViewSet)

urlpatterns = [
    path('', views.index, name='index'),
    path('api/', include(router.urls))
]
