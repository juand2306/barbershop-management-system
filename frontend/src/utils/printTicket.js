/**
 * printTicket — genera HTML de ticket térmico e imprime via iframe oculto.
 *
 * Al usar un iframe independiente:
 * - No se afectan los estilos ni el layout de la app principal.
 * - El contenido de impresión es solo el ticket, sin barras, modales ni fondos.
 * - Funciona con window.print() estándar; con el flag --kiosk-printing de
 *   Chrome la impresión es silenciosa (sin diálogo), ideal para POS.
 *
 * @param {Object} options
 * @param {Object} options.shop   - Datos de la barbería (name, nit, address, phone)
 * @param {Object} options.record - Registro de servicio (ServiceRecord serializado)
 */
export const printTicket = ({ shop, record }) => {
  if (!record) {
    console.error('[printTicket] Se requiere un registro de servicio.');
    return;
  }

  const html = buildTicketHtml({ shop, record });

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:80mm;height:1px;border:none;visibility:hidden;';

  document.body.appendChild(iframe);

  const cleanup = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  };

  // Escribimos el HTML directamente en el documento del iframe y esperamos
  // un tick antes de llamar print() para garantizar que el navegador haya
  // procesado los estilos (especialmente @page y fuentes monoespaciadas).
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (printErr) {
        console.error('[printTicket] Error al llamar print():', printErr);
      }
      // Dejamos 3s para que el navegador pueda abrir el diálogo antes de limpiar.
      setTimeout(cleanup, 3000);
    }, 300);
  } catch (err) {
    console.error('[printTicket] Error al escribir el documento del iframe:', err);
    cleanup();
  }
};

// ─── Helpers de formato ───────────────────────────────────────────────────────

const escHtml = (str) =>
  String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtMoney = (v) => {
  const n = Math.round(Number(v) || 0);
  return `$ ${n.toLocaleString('es-CO')}`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    // Usa la zona horaria local del equipo (debe estar configurada como Colombia).
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
};

// ─── Filas de pago ────────────────────────────────────────────────────────────

const buildPaymentRows = (record) => {
  // Pago mixto: muestra cada split en su propia línea con monto
  if (record.is_mixed_payment && Array.isArray(record.payment_splits_detail) && record.payment_splits_detail.length > 0) {
    return record.payment_splits_detail
      .map((split, idx) => {
        const methodName = escHtml(
          (split.payment_method_name || 'N/A').toUpperCase()
        );
        const amount = fmtMoney(split.amount);
        const label = idx === 0 ? 'PAGO:' : '';
        return `
        <tr>
          <td class="label">${label}</td>
          <td class="value">${methodName}&nbsp;&nbsp;${amount}</td>
        </tr>`;
      })
      .join('');
  }

  // Pago simple
  const methodName = escHtml(
    (record.payment_display || record.payment_method_name || '—').toUpperCase()
  );
  return `
  <tr>
    <td class="label">PAGO:</td>
    <td class="value">${methodName}</td>
  </tr>`;
};

// ─── Constructor del HTML del ticket ─────────────────────────────────────────

const buildTicketHtml = ({ shop = {}, record }) => {
  const barberName = escHtml((record.barber_name || 'N/A').toUpperCase());
  const serviceName = escHtml((record.service_name || 'Servicio').toUpperCase());
  const clientName = record.client_name ? escHtml(record.client_name.toUpperCase()) : null;
  const shopName = escHtml(shop.name || 'BARBERÍA');
  const shopNit = escHtml(shop.nit || '1033813589-6');
  const shopPhone = escHtml(shop.phone || '');

  // La dirección puede tener saltos de línea; generamos un <div> por línea.
  const addressLines = String(shop.address || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `<div>${escHtml(line)}</div>`)
    .join('');

  const paymentRows = buildPaymentRows(record);
  const clientRow = clientName
    ? `<tr><td class="label">CLIENTE:</td><td class="value">${clientName}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    /* ── Página: papel térmico 80mm, alto automático ─────────────────── */
    @page {
      size: 80mm auto;
      margin: 2mm 3mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13pt;
      font-weight: bold;
      color: #000;
      width: 74mm; /* 80mm - 6mm márgenes */
      background: #fff;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    /* ── Encabezado de la tienda ────────────────────────────────────── */
    .header {
      text-align: center;
      margin-bottom: 3mm;
    }

    .shop-name {
      font-size: 18pt;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .shop-subtitle {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
    }

    .shop-meta {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 1mm;
      line-height: 1.5;
    }

    /* ── Separador ──────────────────────────────────────────────────── */
    .divider {
      border: none;
      border-top: 1.5px dashed #000;
      margin: 2.5mm 0;
    }

    /* ── Tabla de datos ─────────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
    }

    td {
      vertical-align: top;
      padding: 1mm 0;
      line-height: 1.5;
      font-size: 13pt;
      font-weight: bold;
      color: #000;
    }

    td.label {
      white-space: nowrap;
      padding-right: 2mm;
      width: 24mm;
    }

    td.value {
      text-align: right;
      word-break: break-word;
      font-weight: bold;
    }

    /* ── Fila de precio destacada ───────────────────────────────────── */
    .price-row td {
      font-size: 15pt;
      font-weight: 900;
      padding-top: 1.5mm;
    }

    /* ── Pie de página ──────────────────────────────────────────────── */
    .footer {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      margin-top: 3mm;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="shop-name">${shopName}</div>
    <div class="shop-subtitle">BARBER SHOP</div>
    ${shopNit ? `<div class="shop-meta">NIT: ${shopNit}</div>` : ''}
    <div class="shop-meta">${addressLines}</div>
  </div>

  <hr class="divider">

  <table>
    <tbody>
      ${shopPhone ? `<tr><td class="label">CELULAR:</td><td class="value">${shopPhone}</td></tr>` : ''}
      <tr><td class="label">FECHA:</td><td class="value">${fmtDate(record.service_datetime)}</td></tr>
      <tr><td class="label">HORA:</td><td class="value">${fmtTime(record.service_datetime)}</td></tr>
      ${clientRow}
      <tr><td class="label">BARBERO:</td><td class="value">${barberName}</td></tr>
    </tbody>
  </table>

  <hr class="divider">

  <table>
    <tbody>
      <tr><td class="label">SERVICIO:</td><td class="value">${serviceName}</td></tr>
      <tr class="price-row"><td class="label">PRECIO:</td><td class="value">${fmtMoney(record.price_charged)}</td></tr>
      ${paymentRows}
    </tbody>
  </table>

  <hr class="divider">

  <div class="footer">¡Gracias por su visita!</div>

</body>
</html>`;
};
