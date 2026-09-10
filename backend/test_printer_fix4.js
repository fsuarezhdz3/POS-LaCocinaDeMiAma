const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const limpiarTextoTicket = (str = '') => {
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

const WIDTH = 26;

function padRow(leftStr, rightStr, width = WIDTH) {
  const available = width - rightStr.length;
  if (leftStr.length > available) {
    const truncated = leftStr.substring(0, available - 1);
    return truncated + ' ' + rightStr;
  }
  const spaces = ' '.repeat(Math.max(1, available - leftStr.length));
  return leftStr + spaces + rightStr;
}

function divider(char = '-', width = WIDTH) {
  return char.repeat(width);
}

const testComanda = {
  num_orden: 15,
  num_mesa: 2,
  mesero: 'Juan',
  fecha_pedido: new Date(),
  items: [
    {
      alimento: 'Paquete de Birria de Res Estilo Jalisco-cocina',
      costo: 140,
      entrada: 'Sopa de Fideo Especial-comal',
      guarnicion1: 'Arroz Rojo con Verduras Frescas-cocina',
      guarnicion2: 'Frijoles Refritos-cocina',
      bebida: 'Agua de Horchata-barra',
    },
    {
      alimento: '2x Postre de Chocoflan Casero-cocina',
      costo: 70,
    },
  ],
};

let lines = [];
lines.push('   LA COCINA DE MAMA');
lines.push('Sabor Casero y Tradicional');
lines.push(divider('='));

const fechaObj = new Date(testComanda.fecha_pedido);
const fechaStr = fechaObj.toLocaleDateString('es-MX');
const hrs = String(fechaObj.getHours()).padStart(2, '0');
const mins = String(fechaObj.getMinutes()).padStart(2, '0');
const hora24Str = `${hrs}:${mins}`;

lines.push(`Fecha:${fechaStr} Hora:${hora24Str}`);
lines.push(`Orden: #${testComanda.num_orden}     Mesa: #${testComanda.num_mesa}`);
if (testComanda.mesero) lines.push(`Mesero: ${limpiarTextoTicket(testComanda.mesero)}`);
lines.push(divider('-'));

testComanda.items.forEach((item) => {
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
    // La primera linea lleva "+ "
    if (wrappedDet.length > 0) {
      lines.push(`  + ${wrappedDet[0]}`);
    }
    // Las lineas siguientes del MISMO atributo llevan sangria "    " sin signo +
    for (let j = 1; j < wrappedDet.length; j++) {
      lines.push(`    ${wrappedDet[j]}`);
    }
  });
});

const total = testComanda.items.reduce((acc, i) => acc + Number(i.costo || 0), 0);
lines.push(divider('-'));
lines.push(padRow('TOTAL:', `$${total.toFixed(2)}`));
lines.push(divider('='));
lines.push('Gracias por su preferencia!');
lines.push('  La Cocina de Mama');
lines.push('');
lines.push('');
lines.push('');

const textoTicket = lines.join('\r\n');

console.log('--- VISTA PREVIA DEL TICKET (NUEVO FORMATO) ---');
console.log(textoTicket);
console.log('------------------------------------------------');

const timestamp = Date.now();
const tempTxtPath = path.join(os.tmpdir(), `ticket_${timestamp}.txt`);
const tempPs1Path = path.join(os.tmpdir(), `print_${timestamp}.ps1`);

fs.writeFileSync(tempTxtPath, textoTicket, 'utf8');

const psScript = `
Add-Type -AssemblyName System.Drawing
$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = 'La Cocina de Mi Ama Tiket'
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$font = New-Object System.Drawing.Font('Courier New', 7.5, [System.Drawing.FontStyle]::Bold)
$text = Get-Content -Path '${tempTxtPath.replace(/\\/g, '\\\\')}' -Raw

$doc.add_PrintPage({
    param($sender, $e)
    $e.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, 2, 0)
})
$doc.Print()
`;

fs.writeFileSync(tempPs1Path, psScript, 'utf8');
const cmd = `powershell -ExecutionPolicy Bypass -File "${tempPs1Path}"`;

exec(cmd, (err, stdout, stderr) => {
  console.log('Error:', err);
  console.log('Stdout:', stdout);
  console.log('Stderr:', stderr);
});
