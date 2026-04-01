# Guía de Deployment

## Backend

### PythonAnywhere

1. Crear cuenta en pythonyanywhere.com
2. Subir código
3. Crear virtual environment
4. Instalar dependencias
5. Configurar base de datos PostgreSQL (Supabase)
6. Configurar variables de entorno
7. Correr migraciones
8. Configurar web app en PythonAnywhere

### Render.com

1. Conectar GitHub
2. Crear nuevo Web Service
3. Seleccionar repositorio
4. Configurar:
   - Build command: `pip install -r requirements.txt && python manage.py migrate`
   - Start command: `gunicorn config.wsgi:application`
5. Agregar environment variables
6. Deploy

## Frontend

### Vercel

1. Conectar GitHub
2. Importar proyecto
3. Configurar framework: Vite
4. Agregar env var: `VITE_API_URL`
5. Deploy

## Database

### Supabase

1. Crear proyecto en supabase.com
2. Copiar connection string PostgreSQL
3. Usar en `DATABASE_URL` en backend
4. Correr migraciones

## Email

### SendGrid

1. Crear cuenta en sendgrid.com
2. Obtener API key
3. Usar en `SENDGRID_API_KEY`

## Checklist Pre-Deploy

- [ ] Debug = False en settings
- [ ] SECRET_KEY segura
- [ ] ALLOWED_HOSTS configurados
- [ ] CORS correcto
- [ ] Database configurada
- [ ] Email configurado
- [ ] Variables de entorno seguras
- [ ] HTTPS forzado
- [ ] Tests pasando
