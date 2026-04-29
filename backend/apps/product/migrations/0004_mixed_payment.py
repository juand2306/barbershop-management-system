from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('product', '0003_alter_productsale_barber'),
        ('payment_method', '0001_initial'),
    ]

    operations = [
        # Agregar campo is_mixed_payment a ProductSale
        migrations.AddField(
            model_name='productsale',
            name='is_mixed_payment',
            field=models.BooleanField(
                default=False,
                help_text='True cuando el pago se divide entre varios métodos de pago',
                verbose_name='Pago mixto'
            ),
        ),
        # Crear modelo ProductSalePaymentSplit
        migrations.CreateModel(
            name='ProductSalePaymentSplit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Monto pagado con este método')),
                ('payment_method', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='product_sale_splits',
                    to='payment_method.paymentmethod'
                )),
                ('product_sale', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payment_splits',
                    to='product.productsale'
                )),
            ],
            options={
                'verbose_name': 'División de Pago (Venta)',
                'verbose_name_plural': 'Divisiones de Pago (Ventas)',
            },
        ),
    ]
