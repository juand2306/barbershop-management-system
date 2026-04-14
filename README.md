# 💈 Barbershop Management System

[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Un sistema integral "Single-Tenant" de primer nivel (Premium) para la gestión completa de barberías. Construido con una arquitectura robusta en **Django REST Framework** y una interfaz moderna e inmersiva (Dark-Theme) en **React** con **Vite**.

## ✨ Características Principales

*   **📅 Calendario Premium (Estilo Spotify):** Una interfaz dinámica que separa visualmente los "walk-ins" (sin cita) de las reservas hechas vía web. Cálculo automático de duraciones y solapes.
*   **🔗 Ecosistema Códigos QR para Barberos:** Cada barbero cuenta con un QR personalizado que lleva directamente a su pasarela de reservas (Landing Page), mejorando la conversión de citas y la retención.
*   **💵 Gestión Financiera y de Comisiones:** 
    *   Cálculo exacto de comisiones (sin que los vales afecten la comisión de forma automática o errónea).
    *   **Control de Vales y Préstamos:** Flujo contable donde los vales son un egreso y sus pagos un ingreso extra.
    *   Cierre de Caja Diario hiper detallado por métodos de pago (Efectivo, Nequi, Tarjeta, etc).
*   **🛒 Punto de Venta (POS):** Registro rápido de servicios y venta de productos, con control de inventario (descuento automático de stock).
*   **📊 Dashboard y Analíticas:** Vista general en tiempo real de los ingresos del día, servicios más agendados y métricas de desempeño de la nómina.
*   **🏢 Gestión de Equipos (Roles):** Roles específicos (Admin, Recepcionista, Barbero) con permisos ajustados.

---

## 💰 Lógica Contable de la Barbería

El sistema garantiza cuadres de caja exactos basándose en esta fórmula matemática inquebrantable:

```text
CAJA DEL DÍA:
─────────────────────────────────────────────────
INGRESOS:
  + Total servicios cobrados
  + Total ventas de productos
  + Pagos de vales recibidos (Cuando un barbero devuelve dinero prestado)

EGRESOS:
  - Total gastos del día (Arriendo, Insumos, etc.)
  - Total vales entregados (Dinero prestado sale de la caja en efectivo)

COMISIONES (Sobre servicios, independientes de vales y productos):
  - Comisiones generadas por los barberos en el día.

GANANCIA NETA INTERNA:
  = Ingresos - Egresos - Comisiones

DESGLOSE POR MÉTODO DE PAGO (Auto-calculado configurable):
  Efectivo en Caja = Ingresos(Efectivo) - Egresos(Efectivo) - Comisiones Pagadas(Efectivo)
  Bancos / Nequi   = Ingresos Digitales - Egresos(Transferencias)
─────────────────────────────────────────────────
```

---

## 📋 Tech Stack

### ⚙️ Backend
*   **Framework:** Django 4.2+ & Django REST Framework
*   **Bases de Datos:** SQLite (Desarrollo por defecto) / PostgreSQL (Producción)
*   **Autenticación:** JWT vía SimpleJWT (Bearer Token)
*   **Filtros & Consultas:** django-filter para endpoints robustos.
*   *(Opcional: Celery + Redis para tareas asíncronas)*

### 🎨 Frontend
*   **Librería Principal:** React 18+
*   **Build Tool:** Vite
*   **Estilos:** TailwindCSS (Estructura de gradientes, Glassmorphism y Dark Mode nativo).
*   **Estado Asíncrono:** React Query (`@tanstack/react-query`).
*   **Gráficos / UI:** Recharts (Analíticas Dashboard), React Big Calendar (Agenda).
*   **Iconos & Otros:** Lucide-React, React Hook Form, Zod (Validación).

---

## 🏗️ Estructura del Backend (Clean Apps)

El backend está diseñado de manera modular, por "Apps" o Dominios de Negocio:

```text
backend/
└── apps/
    ├── barbershop/       # Configuración global, enlaces, redes, landing info.
    ├── users/            # Autenticación, JWT, Roles de Usuario.
    ├── barber/           # Barberos, disponibilidad, métricas y códigos QR.
    ├── service/          # Catálogo de servicios y duraciones.
    ├── appointment/      # Citas, aterrizaje web, y gestión de cancelaciones.
    ├── service_record/   # El "POS". Consolidación de ingresos por cortes.
    ├── product/          # Ventas rápidas e inventario físico.
    ├── advance/          # Módulo estricto de vales y abonos de nómina.
    ├── expense/          # Registro de gastos comerciales.
    ├── payment_method/   # Billeteras digitales (Nequi, Daviplata, Efectivo).
    └── report/           # Motor de Cuadre de Caja Diario.
```

---

## 🛠️ Setup Local (Modo Desarrollo)

### 1️⃣ Backend Setup

```bash
# 1. Clonar el repositorio
git clone https://github.com/juand2306/barbershop-management-system.git
cd barbershop-management-system/backend

# 2. Entorno virtual (Windows/Mac/Linux)
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# 3. Instalación de paquetes
pip install -r requirements.txt

# 4. Configurar Variables de Entorno
copy .env.example .env
# Manten config de DEBUG=True en el .env para usar SQLite por defecto.

# 5. Aplicar Migraciones
python manage.py migrate

# 6. Crear el administrador maestro del sistema
python manage.py createsuperuser

# 7. Ejecutar Servidor
python manage.py runserver
```
*   **API:** `http://localhost:8000/api/`
*   **Panel Nativo Django:** `http://localhost:8000/admin/`

### 2️⃣ Frontend Setup

```bash
cd ../frontend

# Instalar Node Modules
npm install

# Variables de entorno
copy .env.example .env

# Correr Servidor Dev Vite
npm run dev
```
*   **Aplicación Web (Admin & Landing):** `http://localhost:5173/`

---

## 🚀 Despliegue en Producción

La aplicación está preparada para su contenedorización y hospedaje escalable:

1.  Usa base de datos **PostgreSQL**.
2.  Configura `DEBUG=False` en el backend `.env`.
3.  Establece `CORS_ALLOWED_ORIGINS` y `ALLOWED_HOSTS` a los dominios públicos.
4.  Haz build del frontend usando `npm run build` y sírvelo por un reverse proxy como Nginx, o súpelo a un servicio como Vercel/Netlify.
5.  Usa gunicorn o uWSGI para servir la aplicación Django.

---

## 🔐 Ejemplo de Consumo de API (Auth)

```HTTP
POST /api/auth/token/
Content-Type: application/json

{
  "username": "admin",
  "password": "mypassword"
}
```
**Respuesta:** Te retornará los tokens de `access` y `refresh`. En tus subsecuentes peticiones al API, asegúrate de enviar:
`Authorization: Bearer <access_token_aqui>`

---

## 👨‍💻 Autor y Soporte

Diseñado y desarrollado por **Juan D.** (`@juand2306`).
> Dedicado a crear herramientas tecnológicas de alta conversión estéticas y funcionales.
