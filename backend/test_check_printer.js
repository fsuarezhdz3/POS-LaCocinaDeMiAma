const { exec } = require('child_process');

function verificarImpresora(nombreImpresora = 'La Cocina de Mi Ama Tiket') {
  return new Promise((resolve) => {
    const cmd = `powershell -ExecutionPolicy Bypass -Command "Get-Printer -Name '${nombreImpresora}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PrinterStatus"`;
    exec(cmd, (error, stdout) => {
      if (error || !stdout || !stdout.trim()) {
        return resolve({ conectada: false, estado: 'No detectada / Apagada' });
      }
      const estado = stdout.trim();
      return resolve({ conectada: true, estado });
    });
  });
}

verificarImpresora('La Cocina de Mi Ama Tiket').then((res) => console.log('Resultado de verificacion:', res));
verificarImpresora('ImpresoraInexistenteXYZ').then((res) => console.log('Resultado impresora falsa:', res));
