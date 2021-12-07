# Generated by Django 3.2.9 on 2021-12-01 23:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fastci', '0003_alter_job_parents'),
    ]

    operations = [
        migrations.AddField(
            model_name='pipeline',
            name='status',
            field=models.IntegerField(choices=[(0, 'Not Started'), (1, 'Running'), (2, 'Failed'), (3, 'Finished'), (4, 'Cancelled')], default=0),
        ),
    ]