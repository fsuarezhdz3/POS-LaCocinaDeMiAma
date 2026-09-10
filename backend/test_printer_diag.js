const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const psDiag = `
$printer = Get-Printer -Name 'La Cocina de Mi Ama Tiket' -ErrorAction SilentlyContinue
if ($printer) {
    Write-Output "--- PRINTER INFO ---"
    Write-Output "Name: $($printer.Name)"
    Write-Output "PortName: $($printer.PortName)"
    Write-Output "PrinterStatus: $($printer.PrinterStatus)"
    Write-Output "WorkOffline: $($printer.WorkOffline)"
    Write-Output "DriverName: $($printer.DriverName)"
}

Write-Output "--- PNP USB DEVICES ---"
Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -like "*POS*" -or $_.FriendlyName -like "*USB*" -or $_.Class -like "*Print*" } | Select-Object FriendlyName, Status, Class, InstanceId | Format-Table -AutoSize | Out-String | Write-Output

Write-Output "--- WMI WIN32_PRINTER ---"
Get-WmiObject Win32_Printer | Where-Object { $_.Name -like "*La Cocina*" -or $_.Name -like "*POS*" } | Select-Object Name, PortName, PrinterStatus, WorkOffline, ExtendedPrinterStatus, DetectedErrorState | Format-Table -AutoSize | Out-String | Write-Output

Write-Output "--- CURRENT PRINT JOBS ---"
Get-PrintJob -PrinterName 'La Cocina de Mi Ama Tiket' -ErrorAction SilentlyContinue | Select-Object Id, DocumentName, JobStatus, DataType | Format-Table -AutoSize | Out-String | Write-Output
`;

const psPath = path.join(os.tmpdir(), 'diag.ps1');
fs.writeFileSync(psPath, psDiag, 'utf8');

exec(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, (err, stdout, stderr) => {
  console.log('--- DIAGNOSTIC STDOUT ---');
  console.log(stdout);
  console.log('--- DIAGNOSTIC STDERR ---');
  console.log(stderr);
});
