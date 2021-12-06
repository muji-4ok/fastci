import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

import fastci.models
import fastci.tasks

# for job_id in [133, 134, 139, 140]:
#     fastci.tasks.update_job.delay(job_id)

with open('./pipeline_1.json') as f:
    data = f.read()
    fastci.tasks.create_pipeline_from_json.delay(data)
    fastci.tasks.create_pipeline_from_json.delay(data)
    fastci.tasks.create_pipeline_from_json.delay(data)
    # pipeline_id = fastci.tasks.create_pipeline_from_json.delay(data).get()
    # fastci.tasks.cancel_pipeline.delay(pipeline_id)
