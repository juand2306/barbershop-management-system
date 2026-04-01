from django.db import models

class DailyReport(models.Model):
    """Cierre de caja diario."""
    
    STATUS_CHOICES = [
        ('borrador', 'Borrador'),
        ('guardado', 'Guardado'),
        ('confirmado', 'Confirmado'),
    ]
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE,
        related_name='daily_reports'
    )
    
    report_date = models.DateField()
    
    # Totales
    total_services_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    total_products_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    total_expenses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    total_advances = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    
    # Por medio de pago
    total_cash = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    total_nequi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    total_daviplata = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    
    # Utilidades
    barber_commission_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    barbershop_profit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='borrador'
    )
    
    # Snapshot de datos (para histórico)
    data_snapshot = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Reporte Diario"
        verbose_name_plural = "Reportes Diarios"
        unique_together = ('barbershop', 'report_date')
    
    def __str__(self):
        return f"Reporte {self.report_date} - {self.barbershop.name}"


class BarberDailyCommission(models.Model):
    """Desglose de comisión por barbero por día."""
    
    barbershop = models.ForeignKey(
        'barbershop.Barbershop',
        on_delete=models.CASCADE
    )
    barber = models.ForeignKey(
        'barber.Barber',
        on_delete=models.CASCADE,
        related_name='daily_commissions'
    )
    daily_report = models.ForeignKey(
        'DailyReport',
        on_delete=models.CASCADE,
        related_name='barber_commissions'
    )
    
    commission_date = models.DateField()
    
    # Cálculos
    services_total = models.DecimalField(max_digits=12, decimal_places=2)
    commission_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    advances_deducted = models.DecimalField(max_digits=12, decimal_places=2)
    net_commission = models.DecimalField(max_digits=12, decimal_places=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Comisión Diaria Barbero"
        verbose_name_plural = "Comisiones Diarias Barberos"
        unique_together = ('barber', 'commission_date')
    
    def __str__(self):
        return f"{self.barber.name} - {self.commission_date} - {self.net_commission}"
