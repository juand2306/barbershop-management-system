# Barbershop Management System

Sistema integral de gestión para barberías con Django REST Framework + React.

## 🚀 Características

- ✅ Gestión de citas y calendario
- ✅ Control de barberos y comisiones
- ✅ Registro de servicios y precios
- ✅ Inventario y ventas de productos
- ✅ Vales a barberos (sin descuento automático)
- ✅ Cierre de caja diario editable
- ✅ Reportes detallados (PDF y Excel)
- ✅ Portal público para clientes (reservas)
- ✅ Autenticación JWT
- ✅ Roles y permisos (Admin, Manager, Recepcionista, Barbero)

## 📋 Tech Stack

### Backend
- Django 4.2+
- Django REST Framework
- PostgreSQL
- Celery + Redis
- JWT Authentication

### Frontend
- React 18+
- Vite
- TailwindCSS
- React Query
- React Big Calendar

## 🛠️ Setup Local

### Backend

1. **Clonar repositorio**
```bash
git clone https://github.com/juand2306/barbershop-management-system.git
cd barbershop-management-system/backend
```

2. **Crear virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus valores
```

5. **Crear base de datos PostgreSQL**
```bash
createdb barberia_db
```

6. **Correr migraciones**
```bash
python manage.py makemigrations
python manage.py migrate
```

7. **Crear superuser**
```bash
python manage.py createsuperuser
```

8. **Correr servidor**
```bash
python manage.py runserver
```

API disponible en: `http://localhost:8000/api/`
Admin en: `http://localhost:8000/admin/`

### Frontend

1. **Navegar a carpeta frontend**
```bash
cd ../frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Crear .env**
```bash
cp .env.example .env
```

4. **Correr en desarrollo**
```bash
npm run dev
```

App disponible en: `http://localhost:5173/`

## 📚 Documentación

Revisar documentación en el drive compartido.

## 🔐 Seguridad

- JWT para autenticación
- CORS configurado
- Validación de permisos por rol
- Contraseñas hasheadas (Django)

## 📝 Estructura de Base de Datos

Modelos principales:
- Barbershop
- Barber (+ BarberDailyActive)
- Service
- Appointment
- ServiceRecord
- Product (+ ProductSale)
- Advance (Vales)
- Expense
- DailyReport (+ BarberDailyCommission)
- User (Auth)

## 👨‍💻 Autor

Juan D. (@juand2306)
