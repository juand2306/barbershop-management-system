from rest_framework import serializers
from .models import Product, ProductSale, ProductSalePaymentSplit
from apps.payment_method.models import PaymentMethod
from decimal import Decimal


class ProductSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    profit_margin = serializers.FloatField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'barbershop', 'name', 'description', 'price', 'cost_price',
            'current_quantity', 'minimum_quantity', 'is_low_stock', 'profit_margin',
            'supplier', 'image_url', 'active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'created_at', 'updated_at', 'is_low_stock', 'profit_margin')

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value

    def validate_cost_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El costo no puede ser negativo.")
        return value


class ProductSalePaymentSplitSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)

    class Meta:
        model = ProductSalePaymentSplit
        fields = ('id', 'payment_method', 'payment_method_name', 'amount')


class SalePaymentSplitInputSerializer(serializers.Serializer):
    """Validador para cada ítem del array payment_splits en la creación de venta."""
    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class ProductSaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    payment_splits_detail = ProductSalePaymentSplitSerializer(
        source='payment_splits', many=True, read_only=True
    )
    # Campo write-only para recibir los splits desde el frontend
    payment_splits = SalePaymentSplitInputSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = ProductSale
        fields = (
            'id', 'barbershop', 'product', 'product_name', 'barber', 'barber_name',
            'quantity', 'unit_price', 'discount_amount', 'total_price',
            'payment_method', 'payment_method_name',
            'is_mixed_payment', 'payment_splits', 'payment_splits_detail',
            'sale_date', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'total_price', 'is_mixed_payment', 'created_at', 'updated_at')

    def validate(self, data):
        """
        Validación de pago:
        - Si se envían payment_splits → pago mixto: suma debe coincidir con total_price calculado.
        - Si no hay splits → payment_method es obligatorio.
        """
        splits = data.get('payment_splits', [])
        payment_method = data.get('payment_method')

        quantity = data.get('quantity', 1)
        unit_price = data.get('unit_price', Decimal('0'))
        discount = data.get('discount_amount', Decimal('0'))
        total_price = max(Decimal('0'), (quantity * unit_price) - discount)

        if splits:
            if payment_method:
                raise serializers.ValidationError({
                    "payment_method": "No envíes payment_method cuando usas payment_splits (pago mixto)."
                })
            if len(splits) < 2:
                raise serializers.ValidationError({
                    "payment_splits": "El pago mixto requiere al menos 2 métodos de pago."
                })
            total_splits = sum(s['amount'] for s in splits)
            if abs(total_splits - total_price) > Decimal('0.01'):
                raise serializers.ValidationError({
                    "payment_splits": (
                        f"La suma de los splits (${total_splits}) debe ser igual "
                        f"al total de la venta (${total_price})."
                    )
                })
        else:
            if not payment_method:
                raise serializers.ValidationError({
                    "payment_method": "Debes seleccionar un método de pago o usar pago mixto."
                })

        return data

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a 0.")
        return value

    def create(self, validated_data):
        splits_data = validated_data.pop('payment_splits', [])
        is_mixed = bool(splits_data)
        instance = ProductSale.objects.create(**validated_data, is_mixed_payment=is_mixed)
        for split in splits_data:
            ProductSalePaymentSplit.objects.create(
                product_sale=instance,
                payment_method=split['payment_method'],
                amount=split['amount']
            )
        return instance
