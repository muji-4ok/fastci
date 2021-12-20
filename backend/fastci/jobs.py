import logging
import time
from datetime import datetime
from typing import Optional

import docker.errors
import docker.models.containers

from . import models

logging.basicConfig()
logger = logging.getLogger('fastci')


def docker_timestamp_to_seconds(s: str) -> float:
    # stupid shit... (just for the record - the year part won't parse with datetime, because the min year it supports
    # is presumably 1970, definitely not 0001)
    if s == '0001-01-01T00:00:00Z':
        return 0

    # skip Z at the end
    base_part, nanosecs_part = s[:20], s[20:-1]
    # fill with zeros at the end if they are missing (length is 9 since this is nanoseconds)
    extra_secs = int(nanosecs_part.ljust(9, '0')) / 1e9
    return datetime.strptime(base_part, '%Y-%m-%dT%H:%M:%S.').timestamp() + extra_secs


class DockerJob:
    container: docker.models.containers.Container
    timeout_secs: Optional[float]
    status: models.JobStatus
    host_start_time_secs: float
    job_model: models.Job

    def __init__(self, client: docker.DockerClient, model: models.Job):
        self.container = client.containers.get(model.container_id)
        self.timeout_secs = model.timeout_secs
        self.status = model.status
        self.host_start_time_secs = model.host_start_time_secs
        self.job_model = model

    def get_error(self) -> str:
        return self.container.attrs['State']['Error']

    def get_exit_code(self) -> int:
        return self.container.attrs['State']['ExitCode']

    def get_output(self, stdout: bool = True, stderr: bool = True) -> bytes:
        # FIXME: very inefficient
        return self.container.attach(stdout=stdout, stderr=stderr, logs=True)

    def start(self):
        self.status = models.JobStatus.RUNNING

        try:
            self.container.start()
            self.container.reload()
            self.host_start_time_secs = time.time()
        except docker.errors.APIError as e:
            logger.error(e)

            if e.status_code == 400:
                self.status = models.JobStatus.FAILED_TO_START
            elif e.status_code == 404:
                self.status = models.JobStatus.NOT_FOUND
                raise
            else:
                raise

    def save(self):
        self.job_model.status = self.status
        # TODO: Handle stdout/stderr. Also this is slow
        self.job_model.output = self.get_output().decode('utf-8')

        self.job_model.host_start_time_secs = self.host_start_time_secs
        self.job_model.uptime_secs = self.uptime()
        self.job_model.error = self.get_error()

        # TODO: maybe set in other cases as well?
        if self.status == models.JobStatus.FINISHED:
            self.job_model.exit_code = self.get_exit_code()

        # TODO: Maybe not actually needed, but for safety we do this
        self.job_model.full_clean()

        self.job_model.save()

    def uptime(self) -> float:
        if self.status == models.JobStatus.FAILED_TO_START or self.status == models.JobStatus.NOT_STARTED:
            return 0

        # FIXME: this is shit, but I don't want to deal with timezones
        finished_time = docker_timestamp_to_seconds(self.container.attrs['State']['FinishedAt'])

        if finished_time != 0:
            # if finished => compare finished and started times, which are definitely in the same timezone
            started_time = docker_timestamp_to_seconds(self.container.attrs['State']['StartedAt'])
            return finished_time - started_time
        elif self.status == models.JobStatus.CANCELLED or self.status == models.JobStatus.DEPENDENCY_FAILED:
            # we were cancelled even before getting started
            return 0
        else:
            # not finished => running => we can compare our times, which are also in the same timezone
            return time.time() - self.host_start_time_secs

    def cancel(self):
        # TODO: maybe we'll need to update time here?
        if self.status == models.JobStatus.NOT_STARTED:
            self.status = models.JobStatus.CANCELLED
        elif self.status == models.JobStatus.RUNNING:
            try:
                self.container.kill()
                self.status = models.JobStatus.CANCELLED
                self.container.reload()
            except docker.errors.APIError as e:
                if e.status_code == 409:
                    logger.warning(f'Killing the container failed (while trying to cancel). '
                                   f'[error={e}, id={self.container.id}]')
                else:
                    raise
        else:
            logger.warning('Trying to cancel an already stopped container')

    def update(self):
        # WARN: doesn't dump the state to the model, just updates own in-memory state
        if self.status != models.JobStatus.RUNNING:
            return

        try:
            self.container.reload()
        except docker.errors.APIError as e:
            logger.error(e)

            if e.status_code == 400:
                self.status = models.JobStatus.DOCKER_ERROR
                return
            elif e.status_code == 404:
                self.status = models.JobStatus.NOT_FOUND
                raise
            else:
                raise

        if self.container.attrs['State']['Status'] == 'exited':
            self.status = models.JobStatus.FINISHED

        if self.timeout_secs is not None and self.uptime() > self.timeout_secs:
            if self.status == models.JobStatus.FINISHED:
                logger.warning('Container finished, but the total uptime is bigger than the allowed timeout')

            self.cancel()
            # Overwriting `CANCELLED`
            self.status = models.JobStatus.TIMED_OUT
