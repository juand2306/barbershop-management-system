"""
Migration 0002: Amplía el unique_together de BarberDailyCommission para incluir daily_report.

Antes:  unique_together = ('barber', 'commission_date')
Después: unique_together = ('barber', 'commission_date', 'daily_report')

Esta operación es segura (menos restrictiva) y no requiere transformar datos existentes.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('report', '0001_initial'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='barberdailycommission',
            unique_together={('barber', 'commission_date', 'daily_report')},
        ),
    ]
