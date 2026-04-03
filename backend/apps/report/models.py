from django.db import models


class DailyReport(models.Model):
    """
    Cierre de caja diario.

    Logica de dinero en caja:
    ─────────────────────────────────────────────────
    INGRESOS:
      + total_services_amount   (servicios del dia)
      + total_products_amount   (ventas de productos)
      + total_advance_payments  (barberos pagaron vales → entra como EXTRA)

    EGRESOS:
      - total_expenses          (gastos del dia)
      - total_advances_given    (vales entregados hoy → SALE de caja, NO afecta comisiones)

    COMISIONES (calculadas sobre servicios, independiente de vales):
      - barber_commission_total

    GANANCIA NETA de la barberia:
      = ingresos - egresos - comisiones

    DINERO ESPERADO por metodo de pago → ver DailyReportPaymentBreakdown
    ─────────────────────────────────────────────────
    """

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

    report_date = models.DateField(verbose_name='Fecha del cierre')

    # ─── INGRESOS ────────────────────────────────────────────
    total_services_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Total en servicios'
    )
    total_products_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Total en productos vendidos'
    )
    total_advance_payments = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Total ingresado por pago de vales',
        help_text='Dinero EXTRA que entra a caja cuando un barbero paga su vale'
    )

    # ─── EGRESOS ─────────────────────────────────────────────
    total_expenses = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Total en gastos'
    )
    total_advances_given = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Total en vales entregados',
        help_text='Dinero que SALIO de caja en vales. NO descuenta comisiones.'
    )

    # ─── COMISIONES ──────────────────────────────────────────
    barber_commission_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Total comisiones barberos',
        help_text='Suma de comisiones de todos los barberos del dia. NO se ven afectadas por vales.'
    )

    # ─── UTILIDAD ────────────────────────────────────────────
    barbershop_profit = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Ganancia neta de la barberia',
        help_text='(Servicios + Productos + PagosVale) - Gastos - Vales - Comisiones'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='borrador'
    )

    notes = models.TextField(blank=True, verbose_name='Notas del cierre')

    # Snapshot de datos para historico inmutable
    data_snapshot = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Reporte Diario'
        verbose_name_plural = 'Reportes Diarios'
        unique_together = ('barbershop', 'report_date')
        ordering = ['-report_date']

    def __str__(self):
        return f"Cierre {self.report_date} - {self.barbershop.name} [{self.status}]"

    @property
    def total_income(self):
        """Ingresos brutos del dia (incluyendo pagos de vales)."""
        return self.total_services_amount + self.total_products_amount + self.total_advance_payments

    @property
    def total_outflow(self):
        """Egresos del dia (gastos + vales entregados)."""
        return self.total_expenses + self.total_advances_given

    @property
    def expected_in_register(self):
        """
        Dinero que deberia estar en caja al final del dia.
        = Ingresos - Egresos - Comisiones
        """
        return self.total_income - self.total_outflow - self.barber_commission_total


class DailyReportPaymentBreakdown(models.Model):
    """
    Desglose de dinero por metodo de pago para el cierre de caja.

    Para cada metodo de pago se calcula:
      + Ingresos por servicios con ese metodo
      + Ingresos por productos con ese metodo
      + Ingresos por pagos de vales con ese metodo  ← EXTRA
      - Gastos pagados con ese metodo
      - Vales entregados con ese metodo
      = Dinero esperado en ese metodo

    Esto permite saber exactamente cuanto efectivo fisico debe haber,
    cuanto debe aparecer en Nequi, cuanto en Daviplata, etc.
    """

    daily_report = models.ForeignKey(
        'DailyReport',
        on_delete=models.CASCADE,
        related_name='payment_breakdown'
    )
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.CASCADE,
        related_name='daily_breakdowns'
    )

    # Ingresos con este metodo
    services_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Servicios cobrados con este metodo'
    )
    products_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Productos vendidos con este metodo'
    )
    advance_payments_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Pagos de vales recibidos con este metodo',
        help_text='Dinero EXTRA que entro a caja por pago de vale'
    )

    # Egresos con este metodo
    expenses_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Gastos pagados con este metodo'
    )
    advances_given_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Vales entregados con este metodo',
        help_text='Dinero que salio de caja en vales con este metodo'
    )

    class Meta:
        verbose_name = 'Desglose de Pago Diario'
        verbose_name_plural = 'Desgloses de Pago Diarios'
        unique_together = ('daily_report', 'payment_method')

    def __str__(self):
        return f"{self.payment_method.name} | {self.daily_report.report_date} | Esperado: ${self.expected_amount:,.0f}"

    @property
    def expected_amount(self):
        """
        Dinero esperado en este metodo de pago al final del dia.
        = Ingresos - Egresos
        (Las comisiones se pagan aparte, generalmente en efectivo)
        """
        return (
            self.services_amount
            + self.products_amount
            + self.advance_payments_amount
            - self.expenses_amount
            - self.advances_given_amount
        )


class BarberDailyCommission(models.Model):
    """
    Comision ganada por un barbero en un dia especifico.

    IMPORTANTE: Los vales NO se descuentan de la comision.
    La comision es unicamente sobre los servicios realizados.
    El pago real al barbero se acuerda de palabra con el administrador.
    """

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

    commission_date = models.DateField(verbose_name='Fecha')

    # Calculo de comision (SIN descuento de vales)
    services_total = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name='Total servicios del barbero'
    )
    commission_percentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        verbose_name='% comision'
    )
    commission_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name='Comision ganada',
        help_text='services_total * commission_percentage / 100. Los vales NO se descuentan aqui.'
    )

    # Informativo: vales pendientes del barbero (para que el admin tenga contexto)
    pending_advances_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name='Vales pendientes del barbero (informativo)',
        help_text='Suma de vales sin pagar del barbero. Solo informativo, NO se descuenta de la comision.'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Comision Diaria Barbero'
        verbose_name_plural = 'Comisiones Diarias Barberos'
        unique_together = ('barber', 'commission_date')
        ordering = ['-commission_date']

    def __str__(self):
        return f"{self.barber.name} | {self.commission_date} | Comision: ${self.commission_amount:,.0f}"
