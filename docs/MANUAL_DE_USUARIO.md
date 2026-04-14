# 📖 Manual de Usuario - Barbershop Management System

Bienvenido al **Manual de Usuario Principal** del sistema. Este documento describe en detalle todos los módulos de la aplicación, está orientado a la Administración (Dueños y Managers), pero también explica el uso que los otros roles como Recepcionistas o Barberos le dan a la plataforma.

## Índice
1. [Roles y Permisos](#1-roles-y-permisos)
2. [Dashboard Principal](#2-dashboard-principal)
3. [Calendario de Citas y Reservas](#3-calendario-de-citas-y-reservas)
4. [Gestor de Barberos y Códigos QR](#4-gestor-de-barberos-y-códigos-qr)
5. [Servicios Realizados (Punto de Venta)](#5-servicios-realizados-punto-de-venta)
6. [Inventario de Productos](#6-inventario-de-productos)
7. [Control Financiero (Vales y Gastos)](#7-control-financiero-vales-y-gastos)
8. [Cierre de Caja Diario](#8-cierre-de-caja-diario)

---

### 1. Roles y Permisos

El sistema se basa en 4 niveles de roles:

*   **Super Administrador (Dueño):** Acceso total a todas las métricas, configuración de la barbería, eliminación de registros, reportes diarios de caja y creación de otros usuarios.
*   **Manager (Administrador de local):** Acceso a la operación diaria plena. No puede eliminar históricos vitales, ni modificar configuraciones de facturación o de pasarelas, pero sí abrir y cerrar el local, y gestionar nómina.
*   **Recepcionista (Caja):** Encargado del "Día a Día". Solo puede agendar citas, cobrar cortes, vender productos, registrar gastos menores. No puede ver históricos ni ganancias acumuladas (protección de datos de ventas de la empresa).
*   **Barbero:** Acceso mínimo. Accede al sistema desde su celular mediante su QR o login, y puede ver su agenda del día, sus próximos cortes y en algunos casos, ver cuánto ha producido (sin ver las finanzas generales del local).

---

### 2. Dashboard Principal

El Dashboard es la pantalla de control financiero y operativo de la barbería.
*   **Métricas en Tiempo Real:** Muestra el total de Cortes (Servicios Totales), monto en Efectivo recaudado, monto en Medios Digitales (Nequi, etc), y el Total del Día.
*   **Ranking de Barberos:** Muestra qué barbero ha atendido a más clientes y generado más ingresos, fomentando la sana competitividad en el local.
*   **Citas Pendientes:** Te notifica en recuadros rápidos quién debería estar sentado en la silla de inmediato.

---

### 3. Calendario de Citas y Reservas

Nuestra vista "Estilo Spotify".
*   **Agendamiento Visual:** Arrastrando o haciendo clic en los huecos de la agenda, puedes anotar clientes que llamaron por teléfono o entraron al local ("Walk-in").
*   **Cálculo Automático:** Si configuras un "Corte de Cabello" que dura 45 minutos, el calendario bloquea solos los 45 minutos correspondientes.
*   **Diferenciador Visual:** Usa los colores para identificar reservas hechas por internet, contra los clientes sin cita. 

---

### 4. Gestor de Barberos y Códigos QR

Aquí das de alta o baja a los talentos de tu barbería:
*   **Códigos QR Dinámicos:** Generas y descargas automáticamente un código QR único por barbero. Cuando el cliente lo escanea en la vitrina o espejo, lo lleva a una página de agendamiento web donde **ese barbero ya está seleccionado.**
*   **Control de Asistencia:** En este modelo se registra la Llegada y la Salida del barbero para verificar retardos.

---

### 5. Servicios Realizados (Punto de Venta)

Este es el módulo que más usarás para registrar los ingresos que *no fueron simples citas previas*.
*   Cuando un cliente *Walk-in* se corta el pelo, se debe registrar aquí obligatoriamente.
*   **Datos que requiere:** Qué barbero lo atendió, qué servicio fue, cuál fue el método de pago utilizado (Vital para el Cuadre de Caja).
*   *Nota Crítica:* Todas las veces que registres un servicio aquí, automáticamente un porcentaje de "Comisión" es reservado para ese barbero según tu configuración.

---

### 6. Inventario de Productos

Módulo independiente a los cortes.
*   Permite cargar "Pomadas, Shampoos, Ceras" con su precio Costo y Precio Venta.
*   La pestaña de "Venta" descuenta automáticamente del inventario disponible. Si el inventario llega a 0, te avisa en pantalla.

---

### 7. Control Financiero (Vales y Gastos)

La protección del efectivo de la barbería.

*   **Vales (Préstamos):** Si un barbero te pide $50,000 COP para almorzar o un adelanto. Creas un `Vale`. Esto **resta** del efectivo diario reportado, haciendo que tu caja cuadre perfecto. (Ese dinero no afecta sus comisiones de corte).
*   **Pago de Vales:** Al final del día, ese barbero gana mucho en efectivo y te "Devuelve" los $50,000. Tú registras un `Pago de Vale`. Ese dinero ingresa a la caja para mantener las cuentas estables.
*   **Gastos Operativos:** Registra aquí recibos de la luz, compra de servilletas, reparaciones, etc. 

---

### 8. Cierre de Caja Diario

Al final de la jornada de trabajo laboral, en vez de usar Excel:
1.  Te diriges a `Cierre de Turno` o `Reportes`.
2.  El sistema calculará TODO e imprimirá tu balance: *"Se esperan $200,000 en Efectivo, y $150,000 en transferencias de Nequi."*
3.  Tú abres tu caja registradora o tu celular, cuentas que realmente tengas esos montos, y le das **Cerrar Turno**.
4.  Si todo sale correcto, los números se congelan en histórico para que nadie los pueda modificar al día siguiente.
