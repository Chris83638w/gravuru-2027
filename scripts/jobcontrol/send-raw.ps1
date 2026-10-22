# gravuru JobControl J2: eine .las-Datei unveraendert als RAW-Druckauftrag an eine Windows-Druckerwarteschlange senden.
#
# Aufruf (PowerShell, kein Admin noetig):
#   powershell -ExecutionPolicy Bypass -File send-raw.ps1 -Drucker "L-Solution TEST (Datei)" -Datei C:\gravuru-jobs\j2-quelle.las
#
# Sicherheit:
#  - Sendet nur nach Eingabe des genauen Druckernamens.
#  - Haengt der Drucker NICHT an einem Datei-Port (also an einem echten Laser), muss zusaetzlich LASER eingegeben werden.
#    Erste Sendung an einen Laser nur mit Freigabe von Chris, jemandem vor Ort und Restmaterial.
#  - Die Datei wird byteweise gesendet, nichts wird veraendert.
param(
  [Parameter(Mandatory = $true)][string]$Drucker,
  [Parameter(Mandatory = $true)][string]$Datei
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Datei)) { throw "Datei nicht gefunden: $Datei" }
$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Datei))
$kopf = [System.Text.Encoding]::ASCII.GetString($bytes, 0, [Math]::Min(32, $bytes.Length))
if ($kopf -notmatch '!LA ') { throw "Keine L-Solution-Jobdatei (Kopf '!LA' fehlt)." }

$p = Get-Printer -Name $Drucker -ErrorAction SilentlyContinue
if (-not $p) { throw "Drucker nicht gefunden: $Drucker" }
$hash = (Get-FileHash -LiteralPath $Datei -Algorithm SHA256).Hash
$istDatei = $p.PortName -match '^[A-Za-z]:\\' -or $p.PortName -eq 'FILE:'

Write-Host ""
Write-Host "Datei   : $Datei ($($bytes.Length) Bytes)"
Write-Host "SHA256  : $hash"
Write-Host "Drucker : $($p.Name)  Treiber: $($p.DriverName)  Port: $($p.PortName)"
if ($istDatei) { Write-Host "Ziel    : Datei-Port (kein Laser)" -ForegroundColor Green }
else { Write-Host "Ziel    : ECHTE MASCHINE" -ForegroundColor Red }
Write-Host ""

$eingabe = Read-Host "Zum Senden den Druckernamen genau eintippen"
if ($eingabe -ne $p.Name) { Write-Host "Abgebrochen, nichts gesendet."; exit 1 }
if (-not $istDatei) {
  $l = Read-Host "Das geht an einen Laser. Restmaterial eingelegt und jemand vor Ort? Dann LASER eintippen"
  if ($l -ne 'LASER') { Write-Host "Abgebrochen, nichts gesendet."; exit 1 }
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GravuruRaw {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern int StartDocPrinter(IntPtr h, int level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w);
  public static int Send(string printer, string name, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("OpenPrinter Fehler " + Marshal.GetLastWin32Error());
    try {
      var di = new DOCINFO { pDocName = name, pDataType = "RAW" };
      if (StartDocPrinter(h, 1, di) == 0) throw new Exception("StartDocPrinter Fehler " + Marshal.GetLastWin32Error());
      int written = 0;
      try {
        StartPagePrinter(h);
        if (!WritePrinter(h, data, data.Length, out written)) throw new Exception("WritePrinter Fehler " + Marshal.GetLastWin32Error());
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
      return written;
    } finally { ClosePrinter(h); }
  }
}
'@

$n = [GravuruRaw]::Send($p.Name, "gravuru JobControl " + [System.IO.Path]::GetFileName($Datei), $bytes)
Write-Host "Gesendet: $n von $($bytes.Length) Bytes an $($p.Name)." -ForegroundColor Green
if ($istDatei) { Write-Host "Ausgabe pruefen: Get-FileHash '$($p.PortName)'  (muss $hash sein)" }
