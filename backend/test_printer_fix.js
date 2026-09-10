const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Ajuste a 25 caracteres para dar margen perfecto y evitar cualquier corte a la derecha
const WIDTH_58MM = 25;

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

const ticketContent = [
  '    LA COCINA DE MAMA',
  'Sabor Casero y Tradicional',
  divider('='),
  'Fecha: 01/09/26  Hora: 21:28',
  'Orden: #12      Mesa: #4',
  'Mesero: Juan',
  divider('-'),
  padRow('1x Birria de Res', '$135.00'),
  '  * Con arroz y frijoles',
  padRow('1x Agua Horchata', '$25.00'),
  divider('-'),
  padRow('TOTAL:', '$160.00'),
  padRow('Pago:', 'EFECTIVO'),
  padRow('Recibido:', '$200.00'),
  padRow('Cambio:', '$40.00'),
  divider('='),
  'Gracias por su preferencia!',
  '  La Cocina de Mama',
  '',
  '',
  '',
].join('\r\n');

const tempPath = path.join(os.tmpdir(), 'ticket_fix2.txt');
fs.writeFileSync(tempPath, ticketContent, 'utf8');

// Script con fuente 7.8pt y margen izquierdo de 2px para evitar corte en el borde derecho
const psScript = `
Add-Type -AssemblyName System.Drawing
$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = 'La Cocina de Mi Ama Tiket'
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
$font = New-Object System.Drawing.Font('Courier New', 7.8, [System.Drawing.FontStyle]::Bold)
$text = Get-Content -Path '${tempPath.replace(/\\/g, '\\\\')}' -Raw

$doc.add_PrintPage({
    param($sender, $e)
    $e.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, 2, 0)
})
$doc.Print()
`;

const psPath = path.join(os.tmpdir(), 'print_job2.ps1');
fs.writeFileSync(psPath, psScript, 'utf8');

const cmd = `powershell -ExecutionPolicy Bypass -File "${psPath}"`;

console.log('Ejecutando script de impresión con ajuste de margen derecho...');

exec(cmd, (err, stdout, stderr) => {
  console.log('Error:', err);
  console.log('Stdout:', stdout);
  console.log('Stderr:', stderr);
});
