const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ticketContent = `
       LA COCINA DE MAMA
   Sabor Casero y Tradicional
================================
Fecha: 01/09/2026   Hora: 21:18
Orden: #12          Mesa: #4
--------------------------------
1x Birria de Res        $135.00
1x Agua de Horchata      $25.00
--------------------------------
TOTAL:                  $160.00
Pago:                  EFECTIVO
================================
  ¡Gracias por su preferencia!
    La Cocina de Mama




`;

const tempPath = path.join(os.tmpdir(), 'ticket_test.txt');
fs.writeFileSync(tempPath, ticketContent, 'utf8');

// Método 1: PowerShell Out-Printer
const cmd = `powershell -Command "Get-Content -Path '${tempPath}' -Raw | Out-Printer -Name 'La Cocina de Mi Ama Tiket'"`;

console.log('Ejecutando comando:', cmd);

exec(cmd, (err, stdout, stderr) => {
  console.log('Error:', err);
  console.log('Stdout:', stdout);
  console.log('Stderr:', stderr);
});
