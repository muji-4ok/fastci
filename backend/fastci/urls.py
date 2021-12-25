from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('job_list', views.ListJobViewSet)
router.register('job', views.RetrieveJobViewSet)
router.register('pipeline_list', views.ListPipelineViewSet)
router.register('pipeline', views.RetrievePipelineViewSet)
router.register('create_user', views.CreateUserViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/update_job/<int:job_id>/', views.update_job_view),
    path('api/cancel_job/<int:job_id>/', views.cancel_job_view),
    path('api/update_pipeline/<int:pipeline_id>/', views.update_pipeline_view),
    path('api/cancel_pipeline/<int:pipeline_id>/', views.cancel_pipeline_view),
    path('api/create_pipeline/', views.create_pipeline_view),
    path('api/current_user/', views.current_user_view)
]
