const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function verificarEstadoYLimpiarCola(nombreImpresora = 'La Cocina de Mi Ama Tiket') {
  return new Promise((resolve) => {
    const psScript = `
$p = Get-Printer -Name '${nombreImpresora}' -ErrorAction SilentlyContinue
if ($null -eq $p) {
    Write-Output "RESULT:NOT_INSTALLED"
    exit
}

# 1. Purgar/Limpiar cualquier trabajo acumulado anterior para evitar impresiones masivas
Get-PrintJob -PrinterName '${nombreImpresora}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue

if ($p.WorkOffline -eq $true) {
    Write-Output "RESULT:OFFLINE"
    exit
}

if ($p.PrinterStatus -ne "Normal" -and $p.PrinterStatus -ne "Idle") {
    Write-Output "RESULT:ERROR_$($p.PrinterStatus)"
    exit
}

Write-Output "RESULT:READY"
`;

    const psPath = path.join(os.tmpdir(), `check_spooler_${Date.now()}.ps1`);
    fs.writeFileSync(psPath, psScript, 'utf8');

    const cmd = `powershell -ExecutionPolicy Bypass -File "${psPath}"`;

    exec(cmd, (err, stdout) => {
      try { fs.unlinkSync(psPath); } catch (e) {}
      if (err || !stdout) {
        return resolve({ listo: false, razon: 'No detectada / Error ejecucion' });
      }
      const out = stdout.trim();
      if (out.includes('RESULT:READY')) {
        return resolve({ listo: true, razon: 'Impresora lista' });
      } else {
        return resolve({ listo: false, razon: out });
      }
    });
  });
}

verificarEstadoYLimpiarCola('La Cocina de Mi Ama Tiket').then((res) => console.log('Resultado prueba cola:', res));
