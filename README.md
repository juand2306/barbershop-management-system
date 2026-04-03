# Barbershop Management System

Sistema integral de gestión para barberías — Django REST Framework + React.

## 🚀 Características

- ✅ Gestión de citas y calendario
- ✅ Control de barberos y comisiones (sin descuento automático de vales)
- ✅ Registro de servicios con hora editable
- ✅ Inventario y ventas de productos (descuento de stock solo en creación)
- ✅ Vales a barberos con registro de pagos
- ✅ Cierre de caja diario con desglose por método de pago dinámico
- ✅ Gastos categorizados y auditables
- ✅ Reportes detallados
- ✅ Portal público para clientes (reservas)
- ✅ Autenticación JWT (Bearer Token)
- ✅ Roles y permisos (Admin, Manager, Recepcionista, Barbero)

## 💰 Lógica de Caja — Vales

```
CAJA DEL DÍA:
─────────────────────────────────────────────────
INGRESOS:
  + Total servicios cobrados
  + Total ventas de productos
  + Pagos de vales recibidos   ← EXTRA (barbero pagó un vale)

EGRESOS:
  - Total gastos del día
  - Total vales entregados     ← Sale de caja (NO afecta comisiones)

COMISIONES (sobre servicios, independiente de vales):
  - Comisiones de barberos

GANANCIA NETA:
  = Ingresos - Egresos - Comisiones

DESGLOSE POR MÉTODO DE PAGO (dinámico):
  Efectivo esperado   = Servicios(efectivo) + Productos(efectivo)
                       + PagosVale(efectivo) - Gastos(efectivo)
                       - Vales(efectivo)
  Nequi esperado      = idem para Nequi
  Daviplata esperado  = idem para Daviplata
  ...etc (configurable)
─────────────────────────────────────────────────
```

## 📋 Tech Stack

### Backend
- Django 4.2+
- Django REST Framework
- **SQLite en desarrollo** (sin configuración extra)
- **PostgreSQL en producción** (`DEBUG=False` en `.env`)
- Celery + Redis (opcional en desarrollo)
- JWT Authentication (Bearer Token)
- django-filter para filtros avanzados

### Frontend
- React 18+
- Vite
- TailwindCSS
- React Query (@tanstack/react-query)
- React Big Calendar
- Recharts

## 🏗️ Estructura del Backend

```
backend/
└── apps/
    ├── barbershop/       # Info de la barbería
    ├── users/            # Usuarios con roles
    ├── barber/           # Barberos + control diario
    ├── service/          # Catálogo de servicios
    ├── appointment/      # Citas agendadas
    ├── service_record/   # Servicios realizados (ingresos)
    ├── product/          # Inventario + ventas de productos
    ├── advance/          # Vales + pagos de vales ← lógica especial
    ├── expense/          # Gastos de la barbería
    ├── payment_method/   # Medios de pago configurables
    └── report/           # Cierre de caja diario
```

## 🛠️ Setup Local (Desarrollo)

### Backend

```bash
# 1. Clonar
git clone https://github.com/juand2306/barbershop-management-system.git
cd barbershop-management-system/backend

# 2. Virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Variables de entorno (DEBUG=True → usa SQLite automáticamente)
copy .env.example .env

# 5. Migraciones (crea db.sqlite3 automáticamente)
python manage.py migrate

# 6. Crear superadmin
python manage.py createsuperuser

# 7. Correr servidor
python manage.py runserver
```

API en: `http://localhost:8000/api/`  
Admin en: `http://localhost:8000/admin/`

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

App en: `http://localhost:5173/`

## 🚀 Producción

```bash
# Instalar dependencias extra de producción
pip install -r requirements.txt -r requirements-prod.txt

# .env con DEBUG=False y credenciales de PostgreSQL
```

## 🔐 Autenticación

```bash
# Obtener token
POST /api/auth/token/
{ "username": "...", "password": "..." }

# Usar en headers
Authorization: Bearer <access_token>

# Renovar token
POST /api/auth/token/refresh/
{ "refresh": "<refresh_token>" }
```

## 📡 Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET/POST` | `/api/advances/` | Vales |
| `POST` | `/api/advances/{id}/registrar-pago/` | Registrar pago de vale |
| `GET` | `/api/advances/payments/` | Historial de pagos de vales |
| `GET/POST` | `/api/expenses/` | Gastos |
| `GET/POST` | `/api/reports/` | Cierres de caja |
| `GET/POST` | `/api/service-records/` | Servicios realizados |
| `GET/POST` | `/api/payment-methods/` | Métodos de pago |

## 📝 Modelos Principales

- `Barbershop` — Info de la barbería (singleton por instancia)
- `User` — Usuario customizado (Admin/Manager/Receptionist/Barber)
- `Barber` + `BarberDailyActive` — Barberos y asistencia diaria
- `Service` — Catálogo de servicios
- `Appointment` — Citas
- `ServiceRecord` — Servicios realizados (ingreso de caja)
- `Product` + `ProductSale` — Inventario y ventas
- `Advance` + `AdvancePayment` — Vales y sus pagos ← lógica especial
- `Expense` — Gastos
- `PaymentMethod` — Métodos de pago configurables
- `DailyReport` + `DailyReportPaymentBreakdown` + `BarberDailyCommission` — Cierre de caja

## 👨‍💻 Autor

Juan D. (@juand2306)
