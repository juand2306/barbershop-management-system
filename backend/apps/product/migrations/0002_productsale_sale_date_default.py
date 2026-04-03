# Generated migration - Add default to ProductSale.sale_date

from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('product', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productsale',
            name='sale_date',
            field=models.DateField(
                default=timezone.now,
                help_text='Fecha real de la venta',
                verbose_name='Fecha de la venta'
            ),
        ),
    ]
