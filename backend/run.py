import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

import fastci.models
import fastci.tasks


with open('./pipeline_1.json') as f:
    data = f.read()
    pipeline_id = fastci.tasks.create_pipeline_from_json.delay(data).get()
    fastci.tasks.cancel_pipeline.delay(pipeline_id)
