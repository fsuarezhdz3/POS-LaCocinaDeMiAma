const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function verificarHardwareUSB(nombreImpresora = 'La Cocina de Mi Ama Tiket') {
  return new Promise((resolve) => {
    // 1. Verificamos si el dispositivo USB PnP (VID_0416&PID_5011 / YICHIP3121 POS-58) esta en estado "OK"
    // 2. Si no esta OK, purgamos la cola de impresion de Windows para cancelar cualquier intento colgado
    const psScript = `
$usbDevice = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { ($_.FriendlyName -like "*POS-58*" -or $_.InstanceId -like "*VID_0416*") -and $_.Status -eq "OK" }

if ($null -eq $usbDevice) {
    # Impresora no detectada fisicamente (desconectada o apagada)
    # Limpiar cualquier trabajo colgado en la cola de Windows
    Get-PrintJob -PrinterName '${nombreImpresora}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue
    Write-Output "RESULT:DISCONNECTED"
    exit
}

Write-Output "RESULT:CONNECTED"
`;

    const psPath = path.join(os.tmpdir(), `check_pnp_${Date.now()}.ps1`);
    fs.writeFileSync(psPath, psScript, 'utf8');

    // Exec oculto sin ventana pop-up (-WindowStyle Hidden)
    const cmd = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "${psPath}"`;

    exec(cmd, (err, stdout) => {
      try { fs.unlinkSync(psPath); } catch (e) {}
      if (err || !stdout) {
        return resolve({ conectado: false, mensaje: 'Error al verificar hardware USB' });
      }
      const out = stdout.trim();
      if (out.includes('RESULT:CONNECTED')) {
        return resolve({ conectado: true, mensaje: 'Impresora USB conectada y lista' });
      } else {
        return resolve({ conectado: false, mensaje: 'Impresora USB desconectada o apagada' });
      }
    });
  });
}

verificarHardwareUSB('La Cocina de Mi Ama Tiket').then((res) => console.log('Resultado PnP Check:', res));
