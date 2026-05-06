from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.db.models import Sum, F, ExpressionWrapper, DecimalField

from .models import DailyReport, DailyReportPaymentBreakdown, BarberDailyCommission
from .serializers import DailyReportSerializer
from apps.core.permissions import IsAdminOrManager
from apps.service_record.models import ServiceRecord, ServiceRecordPaymentSplit
from apps.product.models import ProductSale, ProductSalePaymentSplit
from apps.advance.models import Advance, AdvancePayment
from apps.expense.models import Expense
from apps.payment_method.models import PaymentMethod
from apps.barber.models import Barber

import datetime


class DailyReportViewSet(viewsets.ModelViewSet):
    """
    CRUD para los cierres de caja diarios.
    Incluye endpoint personalizado para 'Generar / Regenerar' cierre de caja basandose
    en todos los registros diarios de (Servicios, Ventas, Vales, Gastos, PagosVales).
    """
    serializer_class = DailyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Los cierres son pocos; retornar todos

    def get_permissions(self):
        return [IsAdminOrManager()]

    def get_queryset(self):
        qs = DailyReport.objects.prefetch_related(
            'payment_breakdown', 'barber_commissions'
        ).filter(barbershop=self.request.user.barbershop)
        
        status_filter = self.request.query_params.get('status')
        date = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if status_filter:
             qs = qs.filter(status=status_filter)
        if date:
             qs = qs.filter(report_date=date)
        if date_from:
             qs = qs.filter(report_date__gte=date_from)
        if date_to:
             qs = qs.filter(report_date__lte=date_to)
             
        return qs.order_by('-report_date')


    @action(detail=False, methods=['post'], url_path='generar-cierre')
    def generar_cierre(self, request):
        """
        Calcula y guarda un borrador del cierre de caja para la fecha dada.
        Si ya existe un borrador, lo actualiza (re-calculando).
        Si ya esta confirmado, retorna error a menos que se fuerce recalculado.
        
        Body JSON esperado:
        { "date": "YYYY-MM-DD" }
        """
        date_str = request.data.get('date')
        if not date_str:
            return Response({"error": "La fecha (date) es requerida."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Formato de fecha invalido. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        # No permitir cierres para fechas futuras
        today = datetime.date.today()
        if target_date > today:
            return Response(
                {"error": "No se puede generar un cierre para una fecha futura."},
                status=status.HTTP_400_BAD_REQUEST
            )

        barbershop = request.user.barbershop

        with transaction.atomic():
            # 1. Verificar si existe uno
            report, created = DailyReport.objects.get_or_create(
                barbershop=barbershop,
                report_date=target_date,
                defaults={'status': 'borrador'}
            )

            if not created and report.status == 'confirmado':
                 if not request.data.get('force'):
                     return Response({
                          "error": "El cierre ya esta confirmado para esta fecha. Envie force=true si desea recalcular (advertencia: esto pisara los datos confirmados)."
                     }, status=status.HTTP_400_BAD_REQUEST)
                 # Si 'force' pasa, continuara el recalculo y lo volvera 'borrador' otra vez o guardara igual.

            # Limpiar desgloses existentes antes de recalcular
            report.payment_breakdown.all().delete()
            report.barber_commissions.all().delete()

            # 2. Consultar todos los ingresos / egresos del dia
            
            # --- INGRESOS ---
            services = ServiceRecord.objects.filter(
                barbershop=barbershop, service_datetime__date=target_date, status='completado'
            )
            total_services = services.aggregate(Sum('price_charged'))['price_charged__sum'] or 0
            
            product_sales = ProductSale.objects.filter(
                barbershop=barbershop, sale_date=target_date
            )
            total_products = product_sales.aggregate(Sum('total_price'))['total_price__sum'] or 0

            advance_payments = AdvancePayment.objects.filter(
                barbershop=barbershop, payment_date=target_date
            )
            total_adv_payments = advance_payments.aggregate(Sum('amount'))['amount__sum'] or 0

            # --- EGRESOS ---
            expenses = Expense.objects.filter(
                barbershop=barbershop, expense_date=target_date
            )
            total_expenses = expenses.aggregate(Sum('amount'))['amount__sum'] or 0

            advances = Advance.objects.filter(
                barbershop=barbershop, created_at__date=target_date
            )
            total_advances = advances.aggregate(Sum('amount'))['amount__sum'] or 0

            # 3. Calculo de Comisiones
            # Las comisiones son solo sobre los ServiceRecords
            barber_commissions_list = []
            total_commissions = 0

            active_barbers = Barber.objects.filter(barbershop=barbershop, active=True)

            # Pre-agregar totales de servicios por barbero en una sola query (evita N+1)
            services_by_barber = {
                row['barber_id']: row['total']
                for row in services.values('barber_id').annotate(total=Sum('price_charged'))
            }

            # Pre-agregar vales pendientes por barbero en una sola query (evita N+1)
            pending_advances_by_barber = {
                row['barber_id']: row['pending'] or 0
                for row in Advance.objects.filter(
                    barbershop=barbershop
                ).exclude(status='pagado').values('barber_id').annotate(
                    pending=Sum(
                        ExpressionWrapper(
                            F('amount') - F('amount_paid'),
                            output_field=DecimalField(max_digits=12, decimal_places=2)
                        )
                    )
                )
            }

            for barber in active_barbers:
                s_total = services_by_barber.get(barber.id, 0) or 0

                if s_total > 0:
                     c_amount = s_total * (barber.commission_percentage / 100)
                     p_advances = pending_advances_by_barber.get(barber.id, 0)

                     barber_commissions_list.append(BarberDailyCommission(
                          barbershop=barbershop,
                          barber=barber,
                          daily_report=report,
                          commission_date=target_date,
                          services_total=s_total,
                          commission_percentage=barber.commission_percentage,
                          commission_amount=c_amount,
                          pending_advances_total=p_advances
                     ))
                     total_commissions += c_amount

            # Insertar todas las comisiones calculadas de una vez
            if barber_commissions_list:
                BarberDailyCommission.objects.bulk_create(barber_commissions_list)

            # 4. Desglose por Método de Pago
            # Para pagos simples usamos el FK directo; para pagos mixtos sumamos los splits.
            payment_methods = PaymentMethod.objects.filter(barbershop=barbershop, active=True)
            breakdowns_list = []

            # Pre-calcular splits del día para no repetir queries en cada iteración
            service_splits_day = ServiceRecordPaymentSplit.objects.filter(
                service_record__in=services
            )
            product_splits_day = ProductSalePaymentSplit.objects.filter(
                product_sale__in=product_sales
            )

            for pm in payment_methods:
                # Servicios: pagos simples + splits mixtos
                pm_services_simple = (
                    services.filter(payment_method=pm, is_mixed_payment=False)
                    .aggregate(Sum('price_charged'))['price_charged__sum'] or 0
                )
                pm_services_splits = (
                    service_splits_day.filter(payment_method=pm)
                    .aggregate(Sum('amount'))['amount__sum'] or 0
                )
                pm_services = pm_services_simple + pm_services_splits

                # Productos: pagos simples + splits mixtos
                pm_products_simple = (
                    product_sales.filter(payment_method=pm, is_mixed_payment=False)
                    .aggregate(Sum('total_price'))['total_price__sum'] or 0
                )
                pm_products_splits = (
                    product_splits_day.filter(payment_method=pm)
                    .aggregate(Sum('amount'))['amount__sum'] or 0
                )
                pm_products = pm_products_simple + pm_products_splits

                pm_adv_pays = advance_payments.filter(payment_method=pm).aggregate(Sum('amount'))['amount__sum'] or 0
                pm_expenses = expenses.filter(payment_method=pm).aggregate(Sum('amount'))['amount__sum'] or 0
                pm_advances = advances.filter(payment_method=pm).aggregate(Sum('amount'))['amount__sum'] or 0

                # Solo crear registro de desglose si hubo algun movimiento con este metodo
                if any([pm_services, pm_products, pm_adv_pays, pm_expenses, pm_advances]):
                    breakdowns_list.append(DailyReportPaymentBreakdown(
                        daily_report=report,
                        payment_method=pm,
                        services_amount=pm_services,
                        products_amount=pm_products,
                        advance_payments_amount=pm_adv_pays,
                        expenses_amount=pm_expenses,
                        advances_given_amount=pm_advances
                    ))

            if breakdowns_list:
                DailyReportPaymentBreakdown.objects.bulk_create(breakdowns_list)

            # 5. Guardar Reporte Final
            report.total_services_amount = total_services
            report.total_products_amount = total_products
            report.total_advance_payments = total_adv_payments
            
            report.total_expenses = total_expenses
            report.total_advances_given = total_advances
            
            report.barber_commission_total = total_commissions
            # barbershop_profit = (ingresos extras) - egresos - comisiones
            total_income = total_services + total_products + total_adv_payments
            total_outflow = total_expenses + total_advances
            
            report.barbershop_profit = total_income - total_outflow - total_commissions
            
            # Pasar a estado 'guardado' para que lo revisen, o dejar en borrador si habian enviado un draft anterior
            if report.status == 'confirmado':
                report.status = 'guardado' # Fue forzado a recalcular
                
            report.save()

            # Devolver objeto completo mediante Serializer
            serializer = self.get_serializer(report)
            return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='confirmar')
    def confirmar(self, request, pk=None):
         report = self.get_object()
         
         if report.status == 'confirmado':
              return Response({"detail": "El reporte ya está confirmado."}, status=status.HTTP_400_BAD_REQUEST)
              
         report.status = 'confirmado'
         if 'notes' in request.data:
              report.notes = request.data['notes']
              
         # Aqui podriamos setear data_snapshot = json logic para freezearlo permenantemente si quremos.
         report.save()
         return Response(self.get_serializer(report).data)
