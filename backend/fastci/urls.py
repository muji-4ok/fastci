from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('job_list', views.ListJobViewSet)
router.register('job', views.RetrieveJobViewSet)
router.register('pipeline_list', views.ListPipelineViewSet)
router.register('pipeline', views.RetrievePipelineViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/update_job/<int:job_id>/', views.update_job_view),
    path('api/cancel_job/<int:job_id>/', views.cancel_job_view)
]
