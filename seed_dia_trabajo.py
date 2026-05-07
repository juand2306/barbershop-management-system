"""
Script de carga de datos - Día de trabajo típico en barbería
Genera entre 60-80 cortes y 5-10 ventas de productos para hoy.

Uso:
    python seed_dia_trabajo.py
    python seed_dia_trabajo.py --cortes 70 --productos 8
    python seed_dia_trabajo.py --limpiar   # elimina los datos creados por este script hoy
"""

import requests
import random
import json
import argparse
from datetime import datetime, timedelta, time

# ─────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────
BASE_URL = "http://localhost:8000/api"
USERNAME = "juand"
PASSWORD = "juand"

# Horario del día (9am a 8pm)
HORA_INICIO = time(9, 0)
HORA_FIN    = time(20, 0)

# Nombres colombianos realistas para clientes
NOMBRES_CLIENTES = [
    "Andrés García", "Carlos Martínez", "Diego López", "Felipe Rodríguez",
    "Juan Hernández", "Luis González", "Miguel Torres", "Oscar Ramírez",
    "Pablo Vargas", "Ricardo Morales", "Sebastián Castro", "Santiago Ruiz",
    "Alejandro Jiménez", "Daniel Álvarez", "Eduardo Romero", "Fernando Díaz",
    "Gabriel Reyes", "Héctor Moreno", "Iván Suárez", "Julián Ortega",
    "Kevin Flores", "Leonardo Ríos", "Manuel Medina", "Nicolás Aguilar",
    "Omar Gutiérrez", "Pedro Salinas", "Quintín Peña", "Roberto Campos",
    "Samuel Vega", "Tomás Herrera", "Víctor Molina", "William Cruz",
    "Andrés Felipe Cano", "Carlos Andrés Mesa", "Diego Armando Pinto",
    "Felipe Andrés Ospina", "Juan Pablo Arango", "Luis Fernando Mejía",
    "Miguel Ángel Quintero", "Oscar Iván Hurtado", "Pablo Emilio Zapata",
    "Ricardo Andrés Correa", "Sebastián David Lozano", "Santiago José Parra",
    "Alejandro Luis Bermúdez", "Daniel Eduardo Cardona", "Eduardo José Giraldo",
    "Fernando Alfonso Muñoz", "Gabriel Mauricio Acosta", "Héctor Fabio Cárdenas",
    "Iván Darío Duque", "Julián Alberto Estrada", "Kevin Andrés Fernández",
    "Leonardo José Gaviria", "Manuel Alejandro Henao", "Nicolás Felipe Ibarra",
    "Omar Enrique Jaramillo", "Pedro Luis Largo", "Roberto Carlos Montoya",
    "Samuel Esteban Naranjo", "Tomás Antonio Orozco", "Víctor Hugo Palacio",
    "William Fernando Quiroz", "Andrés Camilo Serrano", "Carlos Felipe Tamayo",
    "Diego Fernando Uribe", "Felipe Ernesto Vélez", "Juan David Wilches",
    "Luis Alejandro Zuluaga", "Miguel Fernando Betancur", "Oscar Eduardo Castaño",
    "Pablo Hernán Duarte", "Ricardo Felipe Escobar", "Sebastián Andrés Franco",
    "Santiago Felipe Gómez", "Pipe", "Camilo", "Juancho", "El Mono",
    "Pepito", "Maicol", "Brayan", "Kevin", "Jonathan", "Estiven",
]

NOTAS_OPCIONALES = [
    "", "", "", "", "",  # mayoría sin notas
    "Cliente frecuente", "Primera visita", "Referido por un amigo",
    "Pago exacto", "Le gustó el resultado", "Pidió corte específico",
]


# ─────────────────────────────────────────────
# HELPERS HTTP
# ─────────────────────────────────────────────
class APIClient:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.barbershop_id = None

    def login(self):
        r = self.session.post(f"{BASE_URL}/auth/token/", json={
            "username": USERNAME, "password": PASSWORD
        })
        r.raise_for_status()
        self.token = r.json()["access"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"✓ Login exitoso como '{USERNAME}'")

    def get(self, path, params=None):
        r = self.session.get(f"{BASE_URL}{path}", params=params)
        r.raise_for_status()
        return r.json()

    def post(self, path, data):
        r = self.session.post(f"{BASE_URL}{path}", json=data)
        if not r.ok:
            print(f"  ✗ Error POST {path}: {r.status_code} → {r.text[:200]}")
            return None
        return r.json()

    def delete(self, path):
        r = self.session.delete(f"{BASE_URL}{path}")
        return r.ok

    def get_all_pages(self, path, params=None):
        """Recorre paginación y devuelve todos los resultados."""
        results = []
        url = f"{BASE_URL}{path}"
        p = params or {}
        while url:
            r = self.session.get(url, params=p)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list):
                return data
            results.extend(data.get("results", []))
            url = data.get("next")
            p = {}  # next ya trae los params
        return results


# ─────────────────────────────────────────────
# CARGA DE CATÁLOGOS
# ─────────────────────────────────────────────
def cargar_catalogos(api):
    print("\n── Cargando catálogos del sistema ──")

    # Barbería
    barberías = api.get_all_pages("/barbershop/")
    if not barberías:
        raise SystemExit("✗ No hay barbería registrada. Crea una primero.")
    api.barbershop_id = barberías[0]["id"]
    print(f"  Barbería: {barberías[0]['name']} (id={api.barbershop_id})")

    # Barberos activos
    barberos = [b for b in api.get_all_pages("/barbers/") if b.get("active")]
    if not barberos:
        raise SystemExit("✗ No hay barberos activos. Crea al menos uno.")
    print(f"  Barberos activos: {len(barberos)} → {[b['name'] for b in barberos]}")

    # Servicios activos
    servicios = [s for s in api.get_all_pages("/services/") if s.get("active")]
    if not servicios:
        raise SystemExit("✗ No hay servicios activos. Crea al menos uno.")
    print(f"  Servicios: {len(servicios)} → {[s['name'] for s in servicios]}")

    # Métodos de pago activos
    metodos = [m for m in api.get_all_pages("/payment-methods/") if m.get("active")]
    if not metodos:
        raise SystemExit("✗ No hay métodos de pago. Crea al menos uno.")
    print(f"  Métodos de pago: {[m['name'] for m in metodos]}")

    # Productos con stock > 0
    productos = [p for p in api.get_all_pages("/products/") if p.get("active") and p.get("current_quantity", 0) > 0]
    print(f"  Productos con stock: {len(productos)}")

    return barberos, servicios, metodos, productos


# ─────────────────────────────────────────────
# GENERACIÓN DE HORARIOS
# ─────────────────────────────────────────────
def generar_horarios(n_cortes, fecha_hoy):
    """Distribuye n_cortes de forma realista a lo largo del día."""
    inicio = datetime.combine(fecha_hoy, HORA_INICIO)
    fin    = datetime.combine(fecha_hoy, HORA_FIN)
    rango_seg = int((fin - inicio).total_seconds())

    # Pesos horarios: mañana suave, mediodía pico, tarde pico
    def peso(h):
        if 9 <= h < 11:   return 1.0
        if 11 <= h < 13:  return 2.0
        if 13 <= h < 15:  return 1.5
        if 15 <= h < 18:  return 2.5   # pico tarde
        if 18 <= h < 20:  return 2.0
        return 0.5

    candidatos = []
    dt = inicio
    while dt < fin:
        candidatos.append((dt, peso(dt.hour)))
        dt += timedelta(minutes=15)

    horas = random.choices(
        [c[0] for c in candidatos],
        weights=[c[1] for c in candidatos],
        k=n_cortes
    )
    # Añadir variación de minutos dentro del slot de 15min
    horarios = []
    for h in horas:
        offset = random.randint(0, 14)
        horarios.append(h + timedelta(minutes=offset))

    horarios.sort()
    return horarios


# ─────────────────────────────────────────────
# CREACIÓN DE SERVICE RECORDS
# ─────────────────────────────────────────────
def crear_service_records(api, n_cortes, barberos, servicios, metodos, fecha_hoy):
    print(f"\n── Creando {n_cortes} registros de servicio ──")
    horarios = generar_horarios(n_cortes, fecha_hoy)
    creados = []
    errores = 0

    # Distribución de barberos ponderada (más clientes a los más populares)
    pesos_barberos = [random.uniform(0.8, 1.5) for _ in barberos]

    for i, dt in enumerate(horarios, 1):
        barbero = random.choices(barberos, weights=pesos_barberos, k=1)[0]
        servicio = random.choice(servicios)
        metodo = random.choice(metodos)
        cliente = random.choice(NOMBRES_CLIENTES)
        nota = random.choice(NOTAS_OPCIONALES)

        # Precio real del servicio (a veces con pequeño descuento)
        precio_base = float(servicio["price"])
        precio = precio_base if random.random() > 0.1 else round(precio_base * 0.9, 0)

        payload = {
            "barbershop": api.barbershop_id,
            "barber": barbero["id"],
            "service": servicio["id"],
            "client_name": cliente,
            "price_charged": precio,
            "payment_method": metodo["id"],
            "service_datetime": dt.isoformat(),
            "status": "completado",
            "is_mixed_payment": False,
            "notes": nota,
        }

        resultado = api.post("/service-records/", payload)
        if resultado:
            creados.append(resultado)
            if i % 10 == 0 or i == n_cortes:
                print(f"  [{i}/{n_cortes}] ✓ {cliente} | {barbero['name']} | {servicio['name']} | ${precio:,.0f} | {dt.strftime('%H:%M')}")
        else:
            errores += 1

    print(f"\n  Creados: {len(creados)} | Errores: {errores}")
    return creados


# ─────────────────────────────────────────────
# CREACIÓN DE VENTAS DE PRODUCTOS
# ─────────────────────────────────────────────
def crear_ventas_productos(api, n_productos, barberos, productos, metodos, fecha_hoy):
    if not productos:
        print("\n  (Sin productos con stock disponible, se omite esta sección)")
        return []

    n = min(n_productos, len(productos))
    print(f"\n── Creando {n} ventas de productos ──")
    creadas = []

    productos_sample = random.sample(productos, n)
    for i, producto in enumerate(productos_sample, 1):
        barbero = random.choice(barberos)
        metodo  = random.choice(metodos)
        cantidad = random.randint(1, min(3, producto["current_quantity"]))
        precio_unitario = float(producto["price"])
        total = round(precio_unitario * cantidad, 2)

        # Hora aleatoria durante el día
        hora_venta = datetime.combine(fecha_hoy, HORA_INICIO) + timedelta(
            minutes=random.randint(30, 660)
        )

        payload = {
            "barbershop": api.barbershop_id,
            "product": producto["id"],
            "barber": barbero["id"],
            "quantity": cantidad,
            "unit_price": precio_unitario,
            "discount_amount": 0,
            "total_price": total,
            "payment_method": metodo["id"],
            "is_mixed_payment": False,
            "sale_date": hora_venta.isoformat(),
        }

        resultado = api.post("/products/sales/", payload)
        if resultado:
            creadas.append(resultado)
            print(f"  [{i}/{n}] ✓ {producto['name']} x{cantidad} | {barbero['name']} | ${total:,.0f} | {metodo['name']}")

    return creadas


# ─────────────────────────────────────────────
# LIMPIEZA (modo --limpiar)
# ─────────────────────────────────────────────
def limpiar_datos_hoy(api, fecha_hoy):
    fecha_str = fecha_hoy.strftime("%Y-%m-%d")
    print(f"\n── Limpiando datos creados hoy ({fecha_str}) ──")

    # Service records de hoy
    registros = api.get_all_pages("/service-records/", params={"date": fecha_str})
    eliminados_sr = 0
    for r in registros:
        if api.delete(f"/service-records/{r['id']}/"):
            eliminados_sr += 1
    print(f"  Service records eliminados: {eliminados_sr}")

    # Ventas de productos de hoy
    ventas = api.get_all_pages("/products/sales/", params={"date": fecha_str})
    eliminados_ps = 0
    for v in ventas:
        if api.delete(f"/products/sales/{v['id']}/"):
            eliminados_ps += 1
    print(f"  Ventas de productos eliminadas: {eliminados_ps}")


# ─────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────
def imprimir_resumen(service_records, ventas_productos, barberos):
    print("\n" + "═" * 55)
    print("  RESUMEN DEL DÍA CARGADO")
    print("═" * 55)

    total_servicios = sum(float(r.get("price_charged", 0)) for r in service_records)
    total_productos = sum(float(v.get("total_price", 0)) for v in ventas_productos)

    print(f"  Cortes/servicios creados : {len(service_records)}")
    print(f"  Ventas de productos      : {len(ventas_productos)}")
    print(f"  Ingresos por servicios   : ${total_servicios:>12,.0f} COP")
    print(f"  Ingresos por productos   : ${total_productos:>12,.0f} COP")
    print(f"  Total ingresos del día   : ${total_servicios + total_productos:>12,.0f} COP")

    # Por barbero
    print("\n  Distribución por barbero:")
    conteo = {}
    for r in service_records:
        nombre = r.get("barber_name") or r.get("barber", "?")
        conteo[nombre] = conteo.get(nombre, 0) + 1
    for nombre, cnt in sorted(conteo.items(), key=lambda x: -x[1]):
        bar = "█" * cnt
        print(f"    {str(nombre):<22} {cnt:>3} cortes  {bar}")

    print("═" * 55)
    print("  ✓ Datos listos. Revisa el sistema en http://localhost:5173")
    print("═" * 55)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Seed día de trabajo - Barbería")
    parser.add_argument("--cortes",    type=int, default=None,  help="Número de cortes (default: aleatorio 60-80)")
    parser.add_argument("--productos", type=int, default=None,  help="Número de ventas de productos (default: aleatorio 5-10)")
    parser.add_argument("--limpiar",   action="store_true",     help="Elimina los datos de hoy en vez de crear")
    args = parser.parse_args()

    fecha_hoy = datetime.now().date()
    n_cortes   = args.cortes    or random.randint(60, 80)
    n_productos = args.productos or random.randint(5, 10)

    print("╔══════════════════════════════════════════════════════╗")
    print("║  SEED - DÍA DE TRABAJO TÍPICO EN BARBERÍA           ║")
    print(f"║  Fecha: {fecha_hoy}  |  Cortes objetivo: {n_cortes:<3}          ║")
    print("╚══════════════════════════════════════════════════════╝")

    api = APIClient()
    api.login()

    if args.limpiar:
        limpiar_datos_hoy(api, fecha_hoy)
        return

    barberos, servicios, metodos, productos = cargar_catalogos(api)

    service_records = crear_service_records(api, n_cortes, barberos, servicios, metodos, fecha_hoy)
    ventas_productos = crear_ventas_productos(api, n_productos, barberos, productos, metodos, fecha_hoy)

    imprimir_resumen(service_records, ventas_productos, barberos)


if __name__ == "__main__":
    main()
