from django.core.validators import RegexValidator
from django.db import models


class JobStatus(models.IntegerChoices):
    NOT_STARTED = 0
    RUNNING = 1
    TIMED_OUT = 2
    DOCKER_ERROR = 3
    NOT_FOUND = 4
    # (finished && exit_code == 0) == success
    FINISHED = 5
    FAILED_TO_START = 6
    CANCELLED = 7
    DEPENDENCY_FAILED = 8


class PipelineStatus(models.IntegerChoices):
    NOT_STARTED = 0
    # running == where are still jobs to be ran
    RUNNING = 1
    # failed == all jobs that could be are ran, and we have at least one failed
    FAILED = 2
    # finished == success == all jobs finished
    FINISHED = 3
    # cancelled == whole pipeline cancelled
    CANCELLED = 4


class Pipeline(models.Model):
    name = models.CharField(max_length=200)
    status = models.IntegerField(choices=PipelineStatus.choices, default=PipelineStatus.NOT_STARTED)
    # TODO: info about user and other stats maybe


class Job(models.Model):
    name = models.CharField(max_length=200)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE)

    # id of an already created container
    # a hexadecimal of exact size 64
    container_id = models.CharField(max_length=64, validators=[RegexValidator(regex=r'[0-9a-fA-F]{64}')])

    timeout_secs = models.FloatField(blank=True, null=True)
    host_start_time_secs = models.FloatField(default=0.0)
    uptime_secs = models.FloatField(default=0.0)

    # WARN: I don't think we'll need to delete anything, but if we do, this might cause problems
    parents = models.ManyToManyField('self', blank=True, symmetrical=False)

    status = models.IntegerField(choices=JobStatus.choices, default=JobStatus.NOT_STARTED)
    error = models.CharField(max_length=400, blank=True)
    exit_code = models.IntegerField(blank=True, null=True)

    # TODO:
    #   1) Support other encodings?
    #   2) Distinguish stdout/stderr?
    #   3) Will colors work?
    # in utf-8
    output = models.TextField(default='', blank=True)

    # TODO:
    #   1) support multiple runners
    #   2) pipeline info
    #   3) support subprocesses (not in docker)
    #   4) sticky jobs

    def is_failed(self) -> bool:
        return self.is_complete() and not self.is_successfull()

    def is_successfull(self) -> bool:
        return self.status == JobStatus.FINISHED and self.exit_code == 0

    def is_complete(self) -> bool:
        """
        Returns: complete == was started and stopped running for any reason
        """
        return self.status not in (JobStatus.NOT_STARTED, JobStatus.RUNNING)
