import json

from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import viewsets, mixins
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from . import tasks
from .models import Job, ListingJobSerializer, CompleteJobSerializer, Pipeline, CompletePipelineSerializer, \
    UserSerializer


class BasicPageNumberPagination(PageNumberPagination):
    # @CopyPaste - keep in sync with frontend
    page_size = 20


class ListJobViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = Job.objects.all()
    serializer_class = ListingJobSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = BasicPageNumberPagination


class RetrieveJobViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin):
    queryset = Job.objects.all()
    serializer_class = CompleteJobSerializer
    permission_classes = [IsAuthenticated]


class ListPipelineViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    queryset = Pipeline.objects.all()
    serializer_class = CompletePipelineSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = BasicPageNumberPagination


class RetrievePipelineViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin):
    queryset = Pipeline.objects.all()
    serializer_class = CompletePipelineSerializer
    permission_classes = [IsAuthenticated]


class CreateUserViewSet(viewsets.GenericViewSet, mixins.CreateModelMixin):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        user = User.objects.create_user(**serializer.validated_data)
        user.set_password(serializer.validated_data['password'])
        return user


# Order matters!
@api_view()
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_job_view(request: Request, job_id: int) -> Response:
    # TODO: handle errors
    tasks.update_job.delay(job_id)
    return Response()


@api_view()
@permission_classes([IsAuthenticated])
def current_user_view(request: Request) -> Response:
    return Response(UserSerializer(request.user).data)


@api_view()
@permission_classes([IsAuthenticated])
def cancel_job_view(request: Request, job_id: int) -> Response:
    # TODO: handle errors
    tasks.cancel_job.delay(job_id)
    return Response()


@api_view()
@permission_classes([IsAuthenticated])
def cancel_pipeline_view(request: Request, pipeline_id: int) -> Response:
    # TODO: handle errors
    # TODO: maybe wait for the task's result and send some reply?
    tasks.cancel_pipeline.delay(pipeline_id)
    return Response()


@api_view()
@permission_classes([IsAuthenticated])
def update_pipeline_view(request: Request, pipeline_id: int) -> Response:
    # TODO: handle errors
    # TODO: maybe wait for the task's result and send some reply?
    tasks.step_pipeline.delay(pipeline_id)
    return Response()


@api_view(['POST'])
@parser_classes([JSONParser])
@permission_classes([IsAuthenticated])
def create_pipeline_view(request: Request) -> Response:
    # TODO: handle errors
    tasks.create_pipeline_from_json.delay(json.dumps(request.data))
    return Response()
