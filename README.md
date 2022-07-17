# FastCI

### What is this?

This project is meant to be a super lightweight CI system. I would argue that CI is at its core
just a system to automatically run scripts in a reproducible environment. And a web interface to
monitor and control the jobs is nice. This project is just that - the jobs are no more than docker
containers, and you can set it up so that the pipelines are launched on each push to a git
repository.

The features include:

* Create jobs - docker containers running commands
* Combine the jobs into pipelines - define dependencies between jobs
* Share state between jobs with close to zero overhead
* Integration with git repositories - run a set of pipelines on each push
* Monitor running jobs and pipelines via the web interface
* Start new jobs, cancel and restart failed jobs via the web interface

### Use-cases

* Run tests for your project on each push
* Build your project automatically on each push
* Build the project for a different architecture and run the tests
* Run tests on-demand via the web interface
* Cache any part of the pipeline

### Setup

**NOTE: This project is very much WIP, so don't try to use it in production**

#### Server setup

1. Install the packages in [requirements.txt](requirements.txt)
2. Setup redis to listen on the default port 6379 (i.e. with docker)
3. Build the docker for the front and run it via [build script](front/build_docker.sh)
   and [start script](front/start_front.sh)
4. Start the django server:

```bash
# cd fastci/backend
python manage.py runserver
```

5. Start celery beat and celery worker: (*NOTE: Make sure that you run celery from a user that can
   start and manipulate docker containers*)

```bash
# cd fastci/backend
celery -A fastci.tasks beat

# cd fastci/backend
celery -A fastci.tasks worker
```

Now you can access the web interface at `localhost:3000`

#### Repository setup

If you want to run the tests whenever you push to some respository then what you can do is execute
the steps above on a server where your git repository is hosted and also set the `post-receive` of
that repository to [hook](internal/post-receive).

*NOTE: Also change the shebang in [hook](internal/post-receive) to your desired python interpreter*

### How to create jobs and pipelines

To run anything you will need to create a json configuration of a pipeline, which consists of jobs.

The syntax is this:

```
{
   "name": "<name of pipeline>",
   "jobs": [
      {
         "name": "<name of job>",
         "image": "<docker image tag of the job>",
         "command": "<what command to run inside the container>",
         "volumes": [ # --- optional
            "<what volumes to additionally mount (i.e. argument of -v docker option)>",
            ...
         ],
         "timeout_secs": <time limit for the job> # --- optional
      },
      ...
   ],
   "parents": { # --- optional
      "<name of child job>": [
         "<name of parent job>",
         ...
      ],
      ...
   },
   "bind_workdir_from_host": "<absolute path to a directory that will be mounted to /fastci/workdir>", # --- optional
   "setup_pipeline_dir": <true/false>, # --- optional, default = false
   "repo_url": "<url for a repository to clone at the start of the pipeline>", # --- optional
   "commit_hash": "<at which commit to clone the repository>" # --- optional
}
```

NOTES:

1. Each job starts up in a directory `/fastci/workdir` inside the container
2. `bind_workdir_from_host` - this is mounted into `/fastci/workdir` inside **each** job in a
   pipeline. This way you can easily change the starting directory of all jobs and use data from
   the host
3. `setup_pipeline_dir` - if true, then a temporary directory is created for the pipeline, which is
   shared between all the jobs in a pipeline. This directory is mounted into `/fastci/pipeline`
4. `repo_url` and `commit_hash` - must be specified at the same time. If used, then at the start of
   the pipeline the repository is cloned into a temporary directory and this directory is mounted
   into each job at `/fastci/pipeline`