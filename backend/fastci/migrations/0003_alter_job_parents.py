# Generated by Django 3.2.9 on 2021-12-01 12:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fastci', '0002_auto_20211201_1202'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='parents',
            field=models.ManyToManyField(blank=True, to='fastci.Job'),
        ),
    ]