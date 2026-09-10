import { API_URL } from '../config/api';

/**
 * Servicio de Impresión de Tickets para Impresora Térmica de 58mm
 * Antigravity POS - La Cocina de Mamá
 *
 * Basado en el manual ESC/POS de 58mm thermal printer.
 */

// Formateador de texto a ancho fijo (32 caracteres para papel de 58mm en Fuente A)
const WIDTH_58MM = 32;

function padRow(leftStr, rightStr, width = WIDTH_58MM) {
  const available = width - rightStr.length;
  if (leftStr.length > available) {
    const truncated = leftStr.substring(0, available - 1);
    return truncated + ' ' + rightStr;
  }
  const spaces = ' '.repeat(Math.max(1, available - leftStr.length));
  return leftStr + spaces + rightStr;
}

function divider(char = '-', width = WIDTH_58MM) {
  return char.repeat(width);
}

export const limpiarTextoTicket = (str = '') => {
  if (!str) return '';
  let s = String(str).replace(/-[a-zA-Z0-9_]+$/g, '').trim();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/Ñ/g, 'N');
  return s;
};

function wrapText(text, maxChars) {
  if (!text || text.length <= maxChars) return [text];
  const words = text.split(' ');
  const result = [];
  let current = '';

  words.forEach((w) => {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) result.push(current);
      current = w;
    }
  });
  if (current) result.push(current);
  return result;
}

/**
 * Genera el HTML formateado exactamente para impresoras térmicas de 58mm (48mm área imprimible)
 */
export function generarHTMLTicket(comanda, opciones = {}) {
  const nombreRestaurante = 'LA COCINA DE MAMA';
  const subtitulo = 'Sabor Casero y Tradicional';

  const fechaObj = comanda.fecha_pedido ? new Date(comanda.fecha_pedido) : new Date();
  const fechaFormateada = fechaObj.toLocaleDateString('es-MX');
  const hrs = String(fechaObj.getHours()).padStart(2, '0');
  const mins = String(fechaObj.getMinutes()).padStart(2, '0');
  const hora24Formateada = `${hrs}:${mins}`;

  const items = comanda.items || [];
  const total = Number(comanda.total || items.reduce((acc, i) => acc + (Number(i.costo) || 0), 0));

  const filasItemsHTML = items
    .map((item) => {
      let rawNombre = item.alimento || item.nombre || 'Platillo';
      rawNombre = limpiarTextoTicket(rawNombre);

      let cantidad = 1;
      const matchCant = rawNombre.match(/^(\d+)x\s+/i);
      if (matchCant) {
        cantidad = parseInt(matchCant[1], 10);
        rawNombre = rawNombre.replace(/^(\d+)x\s+/i, '').trim();
      } else if (item.cantidad && Number(item.cantidad) > 0) {
        cantidad = Number(item.cantidad);
      }

      const precio = Number(item.costo || item.precio || 0).toFixed(2);

      const detallesList = [
        item.entrada ? limpiarTextoTicket(item.entrada) : null,
        item.guarnicion1 ? limpiarTextoTicket(item.guarnicion1) : null,
        item.guarnicion2 ? limpiarTextoTicket(item.guarnicion2) : null,
        item.guiso ? limpiarTextoTicket(item.guiso) : null,
        item.bebida ? limpiarTextoTicket(item.bebida) : null,
        item.extras ? limpiarTextoTicket(item.extras) : null,
      ].filter(Boolean);

      const detallesHTML = detallesList
        .map((d) => `<div class="item-extras">+ ${d}</div>`)
        .join('');

      return `
        <div class="ticket-row">
          <span class="item-qty">${cantidad}x</span>
          <span class="item-name">${rawNombre}</span>
          <span class="item-price">$${precio}</span>
        </div>
        ${detallesHTML}
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ticket #${comanda.num_orden || ''}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Courier New', Courier, monospace, sans-serif;
          }
          body {
            width: 58mm;
            max-width: 58mm;
            padding: 3mm 2mm;
            background: #ffffff;
            color: #000000;
            font-size: 11px;
            line-height: 1.2;
          }
          .center {
            text-align: center;
          }
          .bold {
            font-weight: bold;
          }
          .header-title {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .header-sub {
            font-size: 10px;
            margin-bottom: 4px;
          }
          .divider {
            border-top: 1px dashed #000000;
            margin: 4px 0;
          }
          .divider-double {
            border-top: 2px solid #000000;
            margin: 5px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 2px;
          }
          .ticket-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 4px;
            font-size: 11px;
            word-break: break-word;
          }
          .item-qty {
            width: 20px;
            font-weight: bold;
          }
          .item-name {
            flex: 1;
            font-weight: bold;
            padding-right: 4px;
            word-break: break-word;
          }
          .item-price {
            font-weight: bold;
            white-space: nowrap;
          }
          .item-extras {
            font-size: 9.5px;
            padding-left: 20px;
            color: #222222;
            margin-top: 1px;
            word-break: break-word;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 900;
            margin-top: 4px;
          }
          .footer-text {
            font-size: 10px;
            margin-top: 6px;
          }
          @media print {
            body {
              width: 58mm;
              padding: 1mm 1mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="header-title">${nombreRestaurante}</div>
          <div class="header-sub">${subtitulo}</div>
        </div>

        <div class="divider"></div>

        <div class="info-row">
          <span>Fecha: ${fechaFormateada}</span>
          <span>Hora: ${hora24Formateada}</span>
        </div>
        <div class="info-row">
          <span>Orden: <b>#${comanda.num_orden || 'S/N'}</b></span>
          <span>Mesa: <b>#${comanda.num_mesa || 'S/N'}</b></span>
        </div>
        ${comanda.mesero ? `<div class="info-row"><span>Mesero: ${limpiarTextoTicket(comanda.mesero)}</span></div>` : ''}

        <div class="divider"></div>

        <div style="margin-bottom: 4px;">
          ${filasItemsHTML}
        </div>

        <div class="divider"></div>

        <div class="total-row">
          <span>TOTAL:</span>
          <span>$${total.toFixed(2)}</span>
        </div>

        <div class="divider-double"></div>

        <div class="center footer-text">
          <p class="bold">¡Gracias por su compra!</p>
          <p>La Cocina de Mama le desea buen provecho 🍽️</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Genera texto en comandos ESC/POS puros
 */
export function generarTextoESCPOS(comanda, opciones = {}) {
  const nombreRestaurante = 'LA COCINA DE MAMA';
  const subtitulo = 'Sabor Casero y Tradicional';

  const fechaObj = comanda.fecha_pedido ? new Date(comanda.fecha_pedido) : new Date();
  const fechaStr = fechaObj.toLocaleDateString('es-MX');
  const hrs = String(fechaObj.getHours()).padStart(2, '0');
  const mins = String(fechaObj.getMinutes()).padStart(2, '0');
  const hora24Str = `${hrs}:${mins}`;

  const items = comanda.items || [];
  const total = Number(comanda.total || items.reduce((acc, i) => acc + (Number(i.costo) || 0), 0));

  const WIDTH = 26;
  const divider = (char = '-') => char.repeat(WIDTH);
  const padRow = (left, right) => {
    const avail = WIDTH - right.length;
    if (left.length > avail) return left.substring(0, avail - 1) + ' ' + right;
    return left + ' '.repeat(Math.max(1, avail - left.length)) + right;
  };

  let lines = [];
  lines.push('   LA COCINA DE MAMA');
  lines.push('Sabor Casero y Tradicional');
  lines.push(divider('='));
  lines.push(`Fecha:${fechaStr} Hora:${hora24Str}`);
  lines.push(`Orden: #${comanda.num_orden || 'S/N'}     Mesa: #${comanda.num_mesa || 'S/N'}`);
  if (comanda.mesero) lines.push(`Mesero: ${limpiarTextoTicket(comanda.mesero)}`);
  lines.push(divider('-'));

  items.forEach((item) => {
    let rawNombre = item.alimento || item.nombre || 'Platillo';
    rawNombre = limpiarTextoTicket(rawNombre);

    let cantidad = 1;
    const matchCant = rawNombre.match(/^(\d+)x\s+/i);
    if (matchCant) {
      cantidad = parseInt(matchCant[1], 10);
      rawNombre = rawNombre.replace(/^(\d+)x\s+/i, '').trim();
    } else if (item.cantidad && Number(item.cantidad) > 0) {
      cantidad = Number(item.cantidad);
    }

    const precioNum = Number(item.costo || item.precio || 0);
    const precioStr = `$${precioNum.toFixed(2)}`;

    const prefix = `${cantidad}x `;
    const maxNombreWidth = Math.max(8, WIDTH - prefix.length - precioStr.length - 1);

    const nombreWrapped = wrapText(rawNombre, maxNombreWidth);
    const firstLineNombre = nombreWrapped[0] || '';

    lines.push(padRow(`${prefix}${firstLineNombre}`, precioStr, WIDTH));

    for (let i = 1; i < nombreWrapped.length; i++) {
      lines.push(`   ${nombreWrapped[i]}`);
    }

    // Detalles sin etiquetas de campo (solo el nombre de la opcion)
    const detallesList = [
      item.entrada ? limpiarTextoTicket(item.entrada) : null,
      item.guarnicion1 ? limpiarTextoTicket(item.guarnicion1) : null,
      item.guarnicion2 ? limpiarTextoTicket(item.guarnicion2) : null,
      item.guiso ? limpiarTextoTicket(item.guiso) : null,
      item.bebida ? limpiarTextoTicket(item.bebida) : null,
      item.extras ? limpiarTextoTicket(item.extras) : null,
    ].filter(Boolean);

    detallesList.forEach((det) => {
      const wrappedDet = wrapText(det, WIDTH - 4);
      if (wrappedDet.length > 0) {
        lines.push(`  + ${wrappedDet[0]}`);
      }
      for (let j = 1; j < wrappedDet.length; j++) {
        lines.push(`    ${wrappedDet[j]}`);
      }
    });
  });

  lines.push(divider('-'));
  lines.push(padRow('TOTAL:', `$${total.toFixed(2)}`));
  lines.push(divider('='));
  lines.push('Gracias por su preferencia!');
  lines.push('  La Cocina de Mama\n\n\n');

  return lines.join('\n');
}

/**
 * Función principal para imprimir ticket
 * Funciona en Web (window.print() / Iframe), Android (RawBT Bluetooth / Web), e iOS
 */
export async function imprimirTicket(comanda, opciones = {}) {
  const html = generarHTMLTicket(comanda, opciones);

  // 1. Si estamos en Web o entorno de navegador (Chrome / Android / Windows)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    }, 300);

    return true;
  }

  return false;
}

export async function imprimirTicketDirecto(comanda, opciones = {}) {
  const res = await fetch(`${API_URL}/pedidos/imprimir-directo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comanda, opciones }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok && data.ok) {
    return { ok: true, mensaje: 'Ticket impreso directamente en "La Cocina de Mi Ama Tiket" 🖨️' };
  }

  throw new Error(data.error || 'No se detectó la impresora USB ("La Cocina de Mi Ama Tiket"). Verifica que esté encendida y conectada.');
}

/**
 * Genera enlace Intent RawBT para impresoras Bluetooth en Android
 */
export function abrirRawBT(comanda, opciones = {}) {
  const texto = generarTextoESCPOS(comanda, opciones);
  const encodedText = encodeURIComponent(texto);
  const rawbtUrl = `intent://#Intent;scheme=rawbt;package=ru.a42.rawbt;S.txt=${encodedText};end;`;

  if (typeof window !== 'undefined') {
    window.location.href = rawbtUrl;
  }
}
