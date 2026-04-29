from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('service_record', '0001_initial'),
        ('payment_method', '0001_initial'),
    ]

    operations = [
        # Hacer payment_method nullable (ya era null=True, solo agregar blank=True en DB no requiere cambio)
        # Agregar campo is_mixed_payment
        migrations.AddField(
            model_name='servicerecord',
            name='is_mixed_payment',
            field=models.BooleanField(
                default=False,
                help_text='True cuando el pago se divide entre varios métodos de pago',
                verbose_name='Pago mixto'
            ),
        ),
        # Crear modelo ServiceRecordPaymentSplit
        migrations.CreateModel(
            name='ServiceRecordPaymentSplit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Monto pagado con este método')),
                ('payment_method', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='service_splits',
                    to='payment_method.paymentmethod'
                )),
                ('service_record', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payment_splits',
                    to='service_record.servicerecord'
                )),
            ],
            options={
                'verbose_name': 'División de Pago (Servicio)',
                'verbose_name_plural': 'Divisiones de Pago (Servicios)',
            },
        ),
    ]
