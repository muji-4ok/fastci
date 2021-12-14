from django.http import HttpResponse
from rest_framework import viewsets, mixins
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated

from .models import Job, ListingJobSerializer, CompleteJobSerializer, Pipeline, CompletePipelineSerializer
from . import tasks


class ListJobViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = Job.objects.all()
    serializer_class = ListingJobSerializer
    # permission_classes = [IsAuthenticated]


class RetrieveJobViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin):
    queryset = Job.objects.all()
    serializer_class = CompleteJobSerializer


class ListPipelineViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = Pipeline.objects.all()
    serializer_class = CompletePipelineSerializer
    # permission_classes = [IsAuthenticated]


class RetrievePipelineViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin):
    queryset = Pipeline.objects.all()
    serializer_class = CompletePipelineSerializer


@api_view()
def update_job_view(request: Request, job_id: int) -> Response:
    # TODO: handle errors
    tasks.update_job.delay(job_id)
    return Response()


@api_view()
def cancel_job_view(request: Request, job_id: int) -> Response:
    # TODO: handle errors
    tasks.cancel_job.delay(job_id)
    return Response()


# class RegisterView()


def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")
