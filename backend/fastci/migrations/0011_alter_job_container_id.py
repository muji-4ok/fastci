# Generated by Django 4.0.1 on 2022-01-11 19:35

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fastci', '0010_pipeline_cleaned_up'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='container_id',
            field=models.CharField(max_length=64, null=True, validators=[django.core.validators.RegexValidator(regex='[0-9a-fA-F]{64}')]),
        ),
    ]