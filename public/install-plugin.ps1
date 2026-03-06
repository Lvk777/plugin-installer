param(
    [string]$LicenseKey
)

$SUPABASE_URL = "https://fgijcmoxnxeabvepecgz.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWpjbW94bnhlYWJ2ZXBlY2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjI2NjksImV4cCI6MjA4ODMzODY2OX0.EyQdyMSvPgtynPqZ2T_SEsu0F6BdpaHnug4DbAwbxHk"

function Get-HWID {
    try { return (Get-CimInstance Win32_ComputerSystemProduct).UUID } catch {}
    try { return (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").VolumeSerialNumber } catch {}
    return "$env:COMPUTERNAME-$env:USERNAME"
}

function Get-Fingerprint {
    $parts = @()

    try { $parts += (Get-CimInstance Win32_ComputerSystemProduct).UUID } catch {}
    try { $parts += (Get-CimInstance Win32_BIOS).SerialNumber } catch {}
    try { $parts += (Get-CimInstance Win32_BaseBoard).SerialNumber } catch {}
    try { $parts += (Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId } catch {}
    try { $parts += (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").VolumeSerialNumber } catch {}

    $raw = ($parts | Where-Object { $_ } | ForEach-Object { $_.Trim() }) -join '|'
    if (-not $raw) { $raw = "$env:COMPUTERNAME|$env:USERNAME" }

    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    $hash = $sha.ComputeHash($bytes)
    return ([BitConverter]::ToString($hash) -replace '-', '').ToLower()
}

function Get-SystemInfo {
    $hwid = Get-HWID
    $fingerprint = Get-Fingerprint
    $ip = $null
    $os = $null

    try { $ip = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5) } catch {}
    try { $os = (Get-CimInstance Win32_OperatingSystem).Caption } catch { $os = "Windows" }

    return @{
        hwid = $hwid
        fingerprint = $fingerprint
        computer_name = $env:COMPUTERNAME
        username = $env:USERNAME
        ip_address = $ip
        os_version = $os
    }
}

function Test-License {
    param($Key, $SystemInfo)

    $body = @{
        license_key = $Key
        hwid = $SystemInfo.hwid
        fingerprint = $SystemInfo.fingerprint
        computer_name = $SystemInfo.computer_name
        ip_address = $SystemInfo.ip_address
        username = $SystemInfo.username
        os_version = $SystemInfo.os_version
    } | ConvertTo-Json -Depth 10

    try {
        return Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/verify-license" `
            -Method Post `
            -Headers @{
                "apikey" = $SUPABASE_ANON_KEY
                "Authorization" = "Bearer $SUPABASE_ANON_KEY"
                "Content-Type" = "application/json"
            } `
            -Body $body `
            -TimeoutSec 15
    } catch {
        return @{
            valid = $false
            reason = "CONNECTION_FAILED"
            message = $_.Exception.Message
        }
    }
}

$Host.UI.RawUI.WindowTitle = "Luatools Installer - Verificando Licença"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   LUATOOLS PLUGIN INSTALLER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $LicenseKey) {
    $LicenseKey = Read-Host "🔑 Digite sua chave de licença"
    if (-not $LicenseKey) {
        Write-Host "❌ Chave não fornecida!" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host "📡 Coletando informações do sistema..." -ForegroundColor Yellow
$systemInfo = Get-SystemInfo

Write-Host "🔍 Verificando licença..." -ForegroundColor Yellow
$result = Test-License -Key $LicenseKey -SystemInfo $systemInfo

if (-not $result.valid) {
    $reason = switch($result.reason) {
        "INVALID" { "Chave inválida" }
        "EXPIRED" { "Licença expirada" }
        "MAX_ACTIVATIONS" { "Limite de ativações atingido" }
        "HWID_CHANGE_LIMIT" { "Limite de trocas de hardware atingido" }
        "BLOCKED" { "Hardware bloqueado" }
        "CONNECTION_FAILED" { "Falha na conexão" }
        default { "Erro desconhecido" }
    }

    Write-Host "❌ LICENÇA INVÁLIDA: $reason" -ForegroundColor Red
    if ($result.message) { Write-Host "ℹ️ $($result.message)" -ForegroundColor Yellow }
    pause
    exit 1
}

Write-Host "✅ LICENÇA VÁLIDA! ($($result.license_type))" -ForegroundColor Green
if ($result.vpn_detected) {
    Write-Host "⚠️ VPN/Proxy detectado: $($result.country)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Iniciando instalação do plugin..." -ForegroundColor Cyan
Write-Host ""

# ... seu código de instalação aqui ...
