# Generated by Django 4.0.1 on 2022-01-12 02:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fastci', '0012_pipeline_commit_hash'),
    ]

    operations = [
        migrations.AddField(
            model_name='pipeline',
            name='repo_url',
            field=models.CharField(blank=True, max_length=4096, null=True),
        ),
    ]