import json
import os
from typing import Optional

import celery
import docker.errors
from celery.signals import worker_init, beat_init
from celery.utils.log import get_task_logger

# required so models can be imported and all of the infrastructure works
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django

django.setup()

from django.db import transaction
from django.db.models import Q
from . import models
from . import jobs

logger = get_task_logger(__name__)
app = celery.Celery('fastci', broker='redis://', backend='redis://')

# setup only in worker/beat
client: Optional[docker.DockerClient]
client = None


def init_docker_client():
    global client
    client = docker.DockerClient(base_url='unix:///var/run/docker.sock')
    # FYI: logging is not setup at worker_init/beat_init
    print('Docker client running!')


@worker_init.connect
def setup_globals_worker(sender, **kwargs):
    init_docker_client()


@beat_init.connect
def setup_globals_beat(sender, **kwargs):
    init_docker_client()


def make_job_by_id(job_model_id: int) -> jobs.DockerJob:
    job_model = models.Job.objects.get(pk=job_model_id)
    return jobs.DockerJob(client, job_model)


# Is this needed as a standalone task?
@app.task
def create_job(name: str, pipeline_id: int, image: str, command: str, volumes: list[str],
               timeout_secs: Optional[float] = None) -> int:
    """
    Creates the container and an associated Job model

    Returns:
        id of the created Job model
    """
    container = client.containers.create(image, command, detach=True, volumes=volumes)
    job = models.Job(name=name, pipeline=models.Pipeline.objects.get(pk=pipeline_id), container_id=container.id,
                     timeout_secs=timeout_secs)
    job.full_clean()
    job.save()
    return job.pk


@app.task
def start_job(job_model_id: int):
    job = make_job_by_id(job_model_id)
    job.start()
    job.save()


# Is this needed as a standalone task?
@app.task
def update_job(job_model_id: int):
    job = make_job_by_id(job_model_id)
    job.update()
    job.save()


def do_step_job(job: models.Job):
    docker_job = jobs.DockerJob(client, job)

    if docker_job.status == models.JobStatus.NOT_STARTED:
        if any(parent.is_failed() for parent in job.parents.all()):
            docker_job.status = models.JobStatus.DEPENDENCY_FAILED
            docker_job.save()
        elif all(parent.is_successfull() for parent in job.parents.all()):
            docker_job.start()
            docker_job.save()
    elif docker_job.status == models.JobStatus.RUNNING:
        docker_job.update()
        docker_job.save()


# Is this needed as a standalone task?
@app.task
def step_job(job_model_id: int):
    job = models.Job.objects.get(pk=job_model_id)
    do_step_job(job)


@app.task
def cancel_job(job_model_id: int):
    job = make_job_by_id(job_model_id)
    job.cancel()
    job.save()


@app.task
def cancel_pipeline(pipeline_model_id: int):
    pipeline = models.Pipeline.objects.get(pk=pipeline_model_id)

    if pipeline.status == models.PipelineStatus.FINISHED or pipeline.status == models.PipelineStatus.FAILED:
        logger.warning('Trying to cancel an already finished pipeline')
        return
    elif pipeline.status == models.PipelineStatus.CANCELLED:
        logger.warning('Trying to cancel an already cancelled pipeline')
        return

    pipeline.status = models.PipelineStatus.CANCELLED
    pipeline.save()

    for job_model in models.Job.objects.filter(pipeline=pipeline):
        job = make_job_by_id(job_model.pk)
        job.cancel()
        job.save()


# Come up with more consistent naming
@app.task
def step_pipeline(pipeline_model_id: int):
    pipeline = models.Pipeline.objects.get(pk=pipeline_model_id)
    do_step_pipeline(pipeline)


@app.task
@transaction.atomic
def create_pipeline_from_json(json_str: str) -> int:
    # TODO: we pass the json already, so maybe we can somehow tell celery not to serialize any more
    data = json.loads(json_str)
    pipeline = models.Pipeline(name=data['name'])
    pipeline.save()
    jobs_names = dict()

    for job_data in data['jobs']:
        job = models.Job.objects.get(pk=create_job(**job_data, pipeline_id=pipeline.pk))
        # TODO: instead of asserting, return an error that can be parsed and understood
        assert job.name not in jobs_names, 'Names of jobs in a single pipeline must be unique!'
        jobs_names[job.name] = job
        job.save()

    if 'parents' in data:
        for child_name, parent_names in data['parents'].items():
            jobs_names[child_name].parents.set([jobs_names[parent_name] for parent_name in parent_names])

    for job in jobs_names.values():
        job.save()

    return pipeline.pk


def do_step_pipeline(pipeline: models.Pipeline):
    for job in models.Job.objects.filter(pipeline=pipeline):
        do_step_job(job)

    # reading this again is inefficient
    jobs = list(models.Job.objects.filter(pipeline=pipeline))
    # make sure we have non-zero amount of jobs
    assert jobs

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
    elif pipeline.status == models.PipelineStatus.NOT_STARTED:
        pipeline.status = models.PipelineStatus.RUNNING
        pipeline.save()


@app.task
def step_pipelines():
    # TODO: Real bad problems with concurrency. Right now we just run one worker with only one thread...
    #       Maybe we need to switch to PostgreSQL, transactions with sqlite always cause locks, and I don't know why...
    #       How bad could the engine be to cause deadlocks ALL. THE. TIME..? So I assume that I'm doing something wrong
    pipelines_to_step = models.Pipeline.objects.filter(Q(status=models.PipelineStatus.NOT_STARTED) |
                                                       Q(status=models.PipelineStatus.RUNNING))

    for pipeline in pipelines_to_step:
        do_step_pipeline(pipeline)


@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # TODO: The fact that the tasks may overlap might cause problems. And right now they can.
    #       The solution proposed by celery via locking is really trash so I don't want to implement it...
    #       I think we should eventually make it so each task schedules the next one after completion, and get rid of
    #       the external beat scheduler. Another idea is to make an infinite task, maybe with the help of eventlet
    # FYI: logging also isn't setup at this point
    sender.add_periodic_task(0.5, step_pipelines.s(), name='Update job info and schedule jobs')
