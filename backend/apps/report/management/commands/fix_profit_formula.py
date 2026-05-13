"""
Management command: fix_profit_formula
=======================================
Corrige el campo `barbershop_profit` en todos los DailyReport existentes
usando la fórmula correcta:

    profit = total_services_amount + total_products_amount
             - total_expenses
             - barber_commission_total

La fórmula anterior (incorrecta) incluía pagos de vales y vales entregados,
lo que distorsionaba la ganancia neta histórica.

El SerializerMethodField en serializers.py ya devuelve el valor correcto a la UI,
pero el campo almacenado en DB quedaba incorrecto, afectando Django Admin y
cualquier consulta directa.

Uso:
    python manage.py fix_profit_formula
    python manage.py fix_profit_formula --dry-run   # solo muestra cambios sin guardar
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.report.models import DailyReport


class Command(BaseCommand):
    help = 'Recalcula barbershop_profit en todos los DailyReport con la fórmula correcta (sin vales)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra los cambios que se harían sin guardarlos en la base de datos',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('--- MODO DRY-RUN: no se guardarán cambios ---\n'))

        reports = DailyReport.objects.all().order_by('report_date')
        total    = reports.count()
        updated  = 0
        skipped  = 0

        self.stdout.write(f'Procesando {total} reportes...\n')

        with transaction.atomic():
            for report in reports:
                correct_profit = (
                    (report.total_services_amount or 0)
                    + (report.total_products_amount or 0)
                    - (report.total_expenses or 0)
                    - (report.barber_commission_total or 0)
                )

                if report.barbershop_profit == correct_profit:
                    skipped += 1
                    continue

                self.stdout.write(
                    f'  [{report.report_date}] {report.barbershop} | '
                    f'actual={report.barbershop_profit} → correcto={correct_profit}'
                )

                if not dry_run:
                    report.barbershop_profit = correct_profit
                    report.save(update_fields=['barbershop_profit'])

                updated += 1

            if dry_run:
                # Revertir todo en dry-run (aunque save no fue llamado, por si acaso)
                transaction.set_rollback(True)

        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'DRY-RUN completado: {updated} reportes se modificarían, {skipped} ya están correctos.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'✓ {updated} reportes actualizados correctamente. {skipped} ya estaban bien.'
            ))
