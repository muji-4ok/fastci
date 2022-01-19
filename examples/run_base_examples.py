#!/home/egork/PythonVenvs/FastCI/bin/python
import os
import sys
from pathlib import Path

import django

# Bruh, but it is what it is
sys.path.append(str(Path(__file__).parent.parent / 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

import fastci.tasks

DATA_DIR = Path(__file__).parent

pipeline_filenames = [filename for filename in os.listdir(DATA_DIR) if filename.endswith('pipeline.json')]
pipeline_filenames.append('steps/steps_pipeline.json')
print('Found pipelines:', *pipeline_filenames)

for pipeline_filename in pipeline_filenames:
    with open(DATA_DIR / pipeline_filename) as f:
        config = f.read()

    fastci.tasks.create_pipeline_from_json.delay(config).forget()
