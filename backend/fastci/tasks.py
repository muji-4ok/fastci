import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

import celery
import docker.errors
import redis
from celery.signals import worker_init, beat_init
from celery.utils.log import get_task_logger

# required so models can be imported and all of the infrastructure works
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django

django.setup()

from django.db import transaction
from django.db.models import Q
from . import models
from . import jobs

logger = get_task_logger(__name__)
app = celery.Celery('fastci', broker='redis://', backend='redis://')

# setup only in worker/beat
docker_client: Optional[docker.DockerClient]
docker_client = None
redis_client: Optional[redis.Redis]
redis_client = None

COUNT_FIRST_PIPELINES_TO_NOT_CLEAN_UP = 10
INTERNAL_DIR = (Path(__file__).parent.parent.parent / 'internal').absolute()


def notify_of_change():
    """
    Notifies all subscribers that the state has changed
    """
    redis_client.publish('pipeline-job-state-change', 1)


def init_clients():
    global docker_client
    docker_client = docker.DockerClient(base_url='unix:///var/run/docker.sock')
    # FYI: logging is not setup at worker_init/beat_init
    print('Docker client running!')

    global redis_client
    redis_client = redis.Redis()  # default settings are fine
    print('Redis client running!')


@worker_init.connect
def setup_globals_worker(sender, **kwargs):
    init_clients()


@beat_init.connect
def setup_globals_beat(sender, **kwargs):
    init_clients()


def do_create_job(job_data: dict, pipeline_id: int, common_pipeline_dir: Optional[Path],
                  work_dir_to_bind: Optional[Path], commit_hash: Optional[str], repo_url: Optional[str]) -> int:
    """
    Creates the container and an associated Job model

    Returns:
        id of the created Job model
    """
    # TODO: make a dedicated error type instead of doing asserts
    assert 'image' in job_data and 'command' in job_data and 'name' in job_data, \
        'image, command and name fields are required!'

    if 'timeout_secs' in job_data:
        try:
            float(job_data['timeout_secs'])
        except ValueError:
            assert False, 'timeout_secs must be convertable to float!'

    if 'volumes' in job_data:
        assert isinstance(job_data['volumes'], list) and all(isinstance(volume, str) for volume
                                                             in job_data['volumes']), 'volumes must be a list of str!'

    name = job_data['name']
    image = job_data['image']
    command = job_data['command']
    volumes = job_data.get('volumes', [])
    timeout_secs = job_data.get('timeout_secs')

    if common_pipeline_dir is not None:
        # this uses str, not repr
        # FIXME: try to put spaces in path, see if I care
        volumes.append(f'{common_pipeline_dir.absolute()}:/fastci/pipeline')

    if work_dir_to_bind is not None:
        # this uses str, not repr
        # FIXME: try to put spaces in path, see if I care
        # WARN: must be absolute, the caller must check this
        # @CopyPaste - keep in sync with basic_bootstrap.py script
        volumes.append(f'{work_dir_to_bind}:/fastci/workdir')
        volumes.append(f'{INTERNAL_DIR}:/fastci/internal:ro')
        command = f'/fastci/internal/basic_bootstrap.py {command}'

    if commit_hash is not None:
        # then repo_url won't be None
        volumes.append(f'{INTERNAL_DIR}:/fastci/internal:ro')

        if repo_url.startswith('/'):
            volumes.append(f'{repo_url}:{repo_url}:ro')

        command = f'/fastci/internal/repo_bootstrap.py {repo_url} {commit_hash} {command}'

    container = docker_client.containers.create(image, command, detach=True, volumes=volumes)
    job = models.Job(name=name, pipeline=models.Pipeline.objects.get(pk=pipeline_id), container_id=container.id,
                     timeout_secs=timeout_secs)
    job.full_clean()
    job.save()

    return job.pk


def do_clean_up_job(job_model: models.Job):
    job = jobs.DockerJob(docker_client, job_model)
    job.clean_up()
    job_model.container_id = None
    job_model.save()


@transaction.atomic
def do_clean_up_pipeline(pipeline: models.Pipeline):
    assert pipeline.status != models.PipelineStatus.RUNNING and pipeline.status != models.PipelineStatus.NOT_STARTED, \
        'Attempting to clean up an unfinished pipeline!'

    if pipeline.tmp_dir is not None and Path(pipeline.tmp_dir).exists():
        shutil.rmtree(pipeline.tmp_dir)

    pipeline.tmp_dir = None

    pipeline.cleaned_up = True
    pipeline.save()

    for job in models.Job.objects.filter(pipeline=pipeline):
        do_clean_up_job(job)


# NOTE: This is not the same as step_job, even though the name is very similar...
#       All this does is query a set of statistics from the docker. But **does not** in any way change the status.
#       We assume that step_pipeline and step_job, which are called periodically, correctly handle the dependencies
#       and statuses of jobs and pipelines.
#       This function, on the other hand, can be used to update the output, uptime and so on, if docker is lagging
#       with updates
@app.task
def update_job(job_model_id: int):
    job_model = models.Job.objects.get(pk=job_model_id)

    if job_model.container_id is None:
        logger.warning('Trying to update an already cleaned up container!')
    else:
        job = jobs.DockerJob(docker_client, job_model)
        job.update()
        job.save()
        notify_of_change()


def step_job(job: models.Job) -> bool:
    """
    Returns: True if anything changed
    """
    assert job.container_id is not None
    docker_job = jobs.DockerJob(docker_client, job)

    if docker_job.status == models.JobStatus.NOT_STARTED:
        if any(parent.is_failed() for parent in job.parents.all()):
            docker_job.status = models.JobStatus.DEPENDENCY_FAILED
            docker_job.save()

            return True
        elif all(parent.is_successfull() for parent in job.parents.all()):
            docker_job.start()
            docker_job.save()

            return True
    elif docker_job.status == models.JobStatus.RUNNING:
        docker_job.update()
        docker_job.save()

        return True

    return False


@app.task
def cancel_job(job_model_id: int):
    job_model = models.Job.objects.get(pk=job_model_id)

    if job_model.container_id is None:
        logger.warning('Trying to cancel an already cleaned up container!')
    else:
        job = jobs.DockerJob(docker_client, job_model)
        job.cancel()
        job.save()
        notify_of_change()


@app.task
def cancel_pipeline(pipeline_model_id: int):
    pipeline = models.Pipeline.objects.get(pk=pipeline_model_id)

    if pipeline.cleaned_up:
        logger.warning('Trying to cancel an already cleaned up pipeline!')
        return

    if pipeline.status == models.PipelineStatus.FINISHED or pipeline.status == models.PipelineStatus.FAILED:
        logger.warning('Trying to cancel an already finished pipeline!')
        return
    elif pipeline.status == models.PipelineStatus.CANCELLED:
        logger.warning('Trying to cancel an already cancelled pipeline!')
        return

    pipeline.status = models.PipelineStatus.CANCELLED
    pipeline.save()

    for job_model in models.Job.objects.filter(pipeline=pipeline):
        job = jobs.DockerJob(docker_client, job_model)
        job.cancel()
        job.save()

    notify_of_change()


# Come up with more consistent naming
@app.task
def step_pipeline(pipeline_model_id: int):
    pipeline = models.Pipeline.objects.get(pk=pipeline_model_id)

    if pipeline.cleaned_up:
        logger.warning('Trying to step an already cleaned up pipeline!')
        return

    if do_step_pipeline(pipeline):
        notify_of_change()


@app.task
@transaction.atomic
def create_pipeline_from_json(json_str: str) -> int:
    # TODO: we pass the json already, so maybe we can somehow tell celery not to serialize any more
    data = json.loads(json_str)

    bind_workdir_from_host = Path(data['bind_workdir_from_host']) if 'bind_workdir_from_host' in data else None

    if bind_workdir_from_host is not None:
        assert bind_workdir_from_host.is_absolute(), 'bind_workdir_from_host must be absolute!'

    assert ('commit_hash' in data) == ('repo_url' in data), 'Both commit_hash and repo_url are required!'

    commit_hash = data.get('commit_hash')
    repo_url = data.get('repo_url')

    if commit_hash is not None:
        assert bind_workdir_from_host is None, 'If pipeline is in repo mode, we can\'t bind a custom workdir, ' \
                                               'working directory is set to be the root of the repository!'
        assert not data.get('setup_pipeline_dir', False), 'If pipeline is in repo mode, there\'s no need to setup ' \
                                                          'the pipeline dir, since the repository directory is ' \
                                                          'shared for all jobs in the pipeline!'

    # FIXME: if the function fails, we leak the tmpdir
    common_pipeline_dir = Path(tempfile.mkdtemp()) if data.get('setup_pipeline_dir', False) \
                                                      or commit_hash is not None else None

    pipeline = models.Pipeline(name=data['name'], tmp_dir=common_pipeline_dir, commit_hash=commit_hash,
                               repo_url=repo_url)
    pipeline.save()

    jobs_names = dict()

    for job_data in data['jobs']:
        job = models.Job.objects.get(pk=do_create_job(job_data, pipeline.pk, common_pipeline_dir,
                                                      bind_workdir_from_host, commit_hash, repo_url))
        # TODO: instead of asserting, return an error that can be parsed and understood
        assert job.name not in jobs_names, 'Names of jobs in a single pipeline must be unique!'
        jobs_names[job.name] = job
        job.save()

    if 'parents' in data:
        for child_name, parent_names in data['parents'].items():
            jobs_names[child_name].parents.set([jobs_names[parent_name] for parent_name in parent_names])

    for job in jobs_names.values():
        job.save()

    notify_of_change()

    return pipeline.pk


def do_step_pipeline(pipeline: models.Pipeline) -> bool:
    """
    Returns: if anything changed
    """
    assert not pipeline.cleaned_up, 'Trying to step a cleaned up pipeline!'

    jobs = list(models.Job.objects.filter(pipeline=pipeline))
    # make sure we have non-zero amount of jobs
    assert jobs

    # WARN: list comprehension is needed because all of steps must be ran
    anything_changed = any([step_job(job) for job in jobs])

    if all(job.is_complete() for job in jobs):
        # all jobs are either cancelled, transitively cancelled or successfull
        if all(job.status == models.JobStatus.CANCELLED or job.status == models.JobStatus.DEPENDENCY_FAILED or
               job.is_successfull() for job in jobs) and any(not job.is_successfull() for job in jobs):
            pipeline.status = models.PipelineStatus.CANCELLED
        elif any(job.is_failed() for job in jobs):
            pipeline.status = models.PipelineStatus.FAILED
        else:
            pipeline.status = models.PipelineStatus.FINISHED

        pipeline.save()
        anything_changed = True
    elif pipeline.status == models.PipelineStatus.NOT_STARTED:
        pipeline.status = models.PipelineStatus.RUNNING
        pipeline.save()
        anything_changed = True

    return anything_changed


@app.task
def step_pipelines():
    # TODO: Real bad problems with concurrency. Right now we just run one worker with only one thread...
    #       Maybe we need to switch to PostgreSQL, transactions with sqlite always cause locks, and I don't know why...
    #       How bad could the engine be to cause deadlocks ALL. THE. TIME..? So I assume that I'm doing something wrong
    pipelines_to_step = models.Pipeline.objects.filter((Q(status=models.PipelineStatus.NOT_STARTED) |
                                                        Q(status=models.PipelineStatus.RUNNING)) & Q(cleaned_up=False))

    # WARN: list comprehension is needed because all of steps must be ran
    if any([do_step_pipeline(pipeline) for pipeline in pipelines_to_step]):
        notify_of_change()

    pipelines_to_clean_up = models.Pipeline.objects.filter(~Q(status=models.PipelineStatus.NOT_STARTED) &
                                                           ~Q(status=models.PipelineStatus.RUNNING) &
                                                           Q(cleaned_up=False))[COUNT_FIRST_PIPELINES_TO_NOT_CLEAN_UP:]

    for pipeline in pipelines_to_clean_up:
        do_clean_up_pipeline(pipeline)


@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # TODO: The fact that the tasks may overlap might cause problems. And right now they can.
    #       The solution proposed by celery via locking is really trash so I don't want to implement it...
    #       I think we should eventually make it so each task schedules the next one after completion, and get rid of
    #       the external beat scheduler. Another idea is to make an infinite task, maybe with the help of eventlet
    # FYI: logging also isn't setup at this point
    sender.add_periodic_task(0.5, step_pipelines.s(), name='Update job info and schedule jobs')
