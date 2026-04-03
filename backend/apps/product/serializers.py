from rest_framework import serializers
from .models import Product, ProductSale


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


class ProductSaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)

    class Meta:
        model = ProductSale
        fields = (
            'id', 'barbershop', 'product', 'product_name', 'barber', 'barber_name',
            'quantity', 'unit_price', 'discount_amount', 'total_price', 
            'payment_method', 'payment_method_name', 'sale_date', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'barbershop', 'total_price', 'created_at', 'updated_at')

    def validate_quantity(self, value):
        if value <= 0:
             raise serializers.ValidationError("La cantidad debe ser mayor a 0.")
        return value
