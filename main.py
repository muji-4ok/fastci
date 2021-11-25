import enum
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import docker.errors
import docker.models.containers

import node

logging.basicConfig()
logger = logging.getLogger('fastci')


class JobStatus(enum.Enum):
    NOT_STARTED = 0
    RUNNING = 1
    TIMED_OUT = 2
    DOCKER_ERROR = 3
    NOT_FOUND = 4
    FINISHED = 5
    FAILED_TO_START = 6
    CANCELLED = 7


def docker_timestamp_to_seconds(s: str) -> float:
    # stupid shit... (just for the record - the year part won't parse with datetime, because the min year it supports
    # is presumably 1970, definitely not 0001)
    if s == '0001-01-01T00:00:00Z':
        return 0

    # skip Z at the end
    base_part, nanosecs_part = s[:20], s[20:-1]
    return datetime.strptime(base_part, '%Y-%m-%dT%H:%M:%S.').timestamp() + int(nanosecs_part) / 1e9


@dataclass
class Job:
    name: str
    # TODO: support simple subprocesses
    container: docker.models.containers.Container
    parent: Optional['Job']
    children: list['Job']
    timeout_secs: Optional[float] = None
    status: JobStatus = JobStatus.NOT_STARTED
    host_start_time_secs: float = 0

    def get_error(self) -> str:
        return self.container.attrs['State']['Error']

    def get_exit_code(self) -> int:
        return self.container.attrs['State']['ExitCode']

    def get_output(self, stdout: bool = True, stderr: bool = True) -> bytes:
        # FIXME: very inefficient
        return self.container.attach(stdout=stdout, stderr=stderr, logs=True)

    def start(self):
        self.status = JobStatus.RUNNING

        try:
            self.container.start()
            self.container.reload()
            self.host_start_time_secs = time.time()
        except docker.errors.APIError as e:
            logger.error(e)

            if e.status_code == 400:
                self.status = JobStatus.FAILED_TO_START
            elif e.status_code == 404:
                self.status = JobStatus.NOT_FOUND
                raise
            else:
                raise

    def uptime(self) -> float:
        if self.status == JobStatus.FAILED_TO_START:
            return 0

        # FIXME: this is shit, but I don't want to deal with timezones
        finished_time = docker_timestamp_to_seconds(self.container.attrs['State']['FinishedAt'])

        if finished_time != 0:
            # if finished => compare finished and started times, which are definitely in the same timezone
            started_time = docker_timestamp_to_seconds(self.container.attrs['State']['StartedAt'])
            return finished_time - started_time
        else:
            # not finished => running => we can compare our times, which also in the same timezone
            return time.time() - self.host_start_time_secs

    def cancel(self):
        # TODO: maybe we'll need to update time here?

        try:
            self.container.kill()
            self.status = JobStatus.CANCELLED
            self.container.reload()
        except docker.errors.APIError as e:
            if e.status_code == 409:
                logger.warning(f'Trying to cancel a container that is already finished. id={self.container.id}')
            else:
                raise

    def update(self):
        if self.status != JobStatus.RUNNING:
            return

        try:
            self.container.reload()
        except docker.errors.APIError as e:
            logger.error(e)

            if e.status_code == 400:
                self.status = JobStatus.DOCKER_ERROR
                return
            elif e.status_code == 404:
                self.status = JobStatus.NOT_FOUND
                raise
            else:
                raise

        if self.container.attrs['State']['Status'] == 'exited':
            self.status = JobStatus.FINISHED

        if self.timeout_secs is not None and self.uptime() > self.timeout_secs:
            if self.status == JobStatus.FINISHED:
                logger.warning('Container finished, but the total uptime is bigger than the allowed timeout')

            self.cancel()
            # Overwriting `CANCELLED`
            self.status = JobStatus.TIMED_OUT


@dataclass
class Pipeline:
    name: str
    jobs: list[Job]
    initiator: str


def do_step(running: list[Job]) -> list[Job]:
    new_running = []

    for job in running:
        job.update()

        if job.status == JobStatus.RUNNING:
            new_running.append(job)
        elif job.status == JobStatus.FINISHED and job.get_exit_code() == 0:
            for child in job.children:
                print(f'Starting new job! name=[{child.name}]')
                child.start()
                new_running.append(child)
        else:
            print(f'Job failed! job=[{job}]')

    return new_running


def run_pipeline(pipeline: list[Job]):
    running_jobs = node.find_roots(pipeline)

    for job in running_jobs:
        print(f'Starting new job! name=[{job.name}]')
        job.start()

    while running_jobs:
        running_jobs = do_step(running_jobs)
        time.sleep(0.1)

    for job in pipeline:
        job.container.remove()


# TODO: make persistent
pipelines: dict[str, Pipeline]
pipelines = dict()

# TODO: make persistent
jobs: dict[str, Job]
jobs = dict()

client = docker.DockerClient(base_url='unix:///var/run/docker.sock')

container = client.containers.create('ubuntu-test', ['python3', '/home/egork/Projects/py/fastci/printer.py'],
                                     detach=True,
                                     volumes=['/home/egork/Projects/py/fastci:/home/egork/Projects/py/fastci'])
job = Job('printer', container, None, [])
job.start()
i = 0

while job.status == JobStatus.RUNNING:
    i += 1
    job.update()
    print(i)

    if i == 20:
        job.cancel()

    time.sleep(0.1)

print(job)

# container = client.containers.create('ubuntu-test', ['/home/egork/Projects/py/fastci/failing_commands.sh'],
#                                      detach=True,
#                                      volumes=['/home/egork/Projects/py/fastci:/home/egork/Projects/py/fastci'])
# container = client.containers.create('ubuntu-test', ['cock and balls'],
#                                      detach=True,
#                                      volumes=['/home/egork/Projects/py/fastci:/home/egork/Projects/py/fastci'])
# container = client.containers.create('ubuntu-test', ['python3', '/home/egork/Projects/py/fastci/delayed_printer.py'],
#                                      detach=True,
#                                      volumes=['/home/egork/Projects/py/fastci:/home/egork/Projects/py/fastci'])
# job = Job('job', container, None, [], timeout_secs=1.5)

# job.start()

# time.sleep(1.5)
# job.update()
# print('Status:', job.status)
# print('Error:', job.get_error())
# print('ExitCode:', job.get_exit_code())
# print('Uptime(secs):', job.uptime())
# print('Output:')
# print(job.get_output().decode('ascii'))
# print('Stderr:')
# print(job.get_output(stdout=False).decode('ascii'))
# job.container.reload()

# writer_container = client.containers.create('ubuntu-test', ['/home/egork/Projects/py/fastci/writer_commands.sh'],
#                                             detach=True,
#                                             volumes=['/home/egork/Projects/py/fastci:/home/egork/Projects/py/fastci'])
# reader_container = client.containers.create('ubuntu-test', ['python3', '/home/egork/Projects/py/fastci/reader.py'],
#                                             detach=True,
#                                             volumes=['/home/egork/Projects/py/fastci:/home/egork/Projects/py/fastci'])
#
# writer_job = Job('writer', writer_container, None, [])
#
# reader_job = Job('reader', reader_container, writer_job, [])
# writer_job.children.append(reader_job)
#
# jobs['writer'] = writer_job
# jobs['reader'] = reader_job
# pipelines['something'] = [writer_job, reader_job]
#
# run_pipeline(pipelines['something'])
#
# for job in pipelines['something']:
#     print(f'Job {job.name} stdout:')
#     print(job.stdout.decode('ascii'))
