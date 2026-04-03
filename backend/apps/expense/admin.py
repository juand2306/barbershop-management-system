from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('barbershop', 'category', 'amount', 'payment_method', 'expense_date', 'registered_by')
    list_filter = ('barbershop', 'category', 'expense_date')
    search_fields = ('detail',)
    date_hierarchy = 'expense_date'
    ordering = ('-expense_date',)
