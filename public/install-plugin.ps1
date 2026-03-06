# luatools-plugin-installer.ps1
# Versão oficial com licenciamento

param(
    [string]$LicenseKey
)

# ===== CONFIGURAÇÕES =====
$SUPABASE_URL = "https://fgijcmoxnxeabvepecgz.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWpjbW94bnhlYWJ2ZXBlY2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjI2NjksImV4cCI6MjA4ODMzODY2OX0.EyQdyMSvPgtynPqZ2T_SEsu0F6BdpaHnug4DbAwbxHk"
$DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1479314514561466634/NowhlrsPxdqsEwha8SmSC5FFkoNSDG80p6t_v2DNlM0r_N5CA-37J8SP1bpZLmjjVA3_"

# ===== FUNÇÕES DE LICENCIAMENTO =====
function Get-HWID {
    try { return (Get-WmiObject Win32_ComputerSystemProduct).UUID } catch {}
    try { return (Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'").VolumeSerialNumber } catch {}
    return "$env:COMPUTERNAME-$env:USERNAME"
}

function Get-SystemInfo {
    $hwid = Get-HWID
    $ip = $null
    try { $ip = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5) } catch {}
    return @{
        hwid = $hwid
        computer_name = $env:COMPUTERNAME
        username = $env:USERNAME
        ip_address = $ip
        os_version = (Get-WmiObject Win32_OperatingSystem).Caption
    }
}

function Test-License {
    param($Key, $SystemInfo)
    
    $body = @{
        license_key = $Key
        hwid = $SystemInfo.hwid
        computer_name = $SystemInfo.computer_name
        ip_address = $SystemInfo.ip_address
        username = $SystemInfo.username
        os_version = $SystemInfo.os_version
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/verify-license" `
            -Method Post `
            -Headers @{
                "apikey" = $SUPABASE_KEY
                "Content-Type" = "application/json"
            } `
            -Body $body `
            -TimeoutSec 10
        return $response
    } catch {
        return @{ valid = $false; reason = "CONNECTION_FAILED" }
    }
}

function Send-DiscordLog {
    param($SystemInfo, $Status, $LicenseKey)
    
    $color = switch($Status) {
        "APROVADO" { 3066993 }
        "REJEITADO" { 15158332 }
        default { 16753920 }
    }
    
    $embed = @{
        title = "🚀 $Status - Ativação Luatools"
        color = $color
        fields = @(
            @{ name = "Status"; value = $Status; inline = $true }
            @{ name = "Licença"; value = $LicenseKey; inline = $true }
            @{ name = "HWID"; value = $SystemInfo.hwid.Substring(0, [Math]::Min(16, $SystemInfo.hwid.Length)) + "..."; inline = $false }
            @{ name = "Computador"; value = $SystemInfo.computer_name; inline = $true }
            @{ name = "Usuário"; value = $SystemInfo.username; inline = $true }
            @{ name = "IP"; value = $SystemInfo.ip_address; inline = $true }
        )
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    
    try {
        Invoke-RestMethod -Uri $DISCORD_WEBHOOK -Method Post -Body (@{ embeds = @($embed) } | ConvertTo-Json) -ContentType "application/json" -ErrorAction SilentlyContinue
    } catch {}
}

# ===== VERIFICAÇÃO INICIAL =====
$Host.UI.RawUI.WindowTitle = "Luatools Installer - Verificando Licença"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   LUATOOLS PLUGIN INSTALLER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se a key foi fornecida como parâmetro
if (-not $LicenseKey) {
    $LicenseKey = Read-Host "🔑 Digite sua chave de licença"
    if (-not $LicenseKey) {
        Write-Host "❌ Chave não fornecida!" -ForegroundColor Red
        pause
        exit 1
    }
}

# Coletar informações
Write-Host "📡 Coletando informações do sistema..." -ForegroundColor Yellow
$systemInfo = Get-SystemInfo

# Verificar licença
Write-Host "🔍 Verificando licença..." -ForegroundColor Yellow
$result = Test-License -Key $LicenseKey -SystemInfo $systemInfo

if (-not $result.valid) {
    $reason = switch($result.reason) {
        "INVALID" { "Chave inválida" }
        "EXPIRED" { "Licença expirada" }
        "MAX_ACTIVATIONS" { "Limite de ativações atingido" }
        "BLOCKED" { "Hardware bloqueado" }
        "CONNECTION_FAILED" { "Falha na conexão (verifique internet)" }
        default { "Erro desconhecido" }
    }
    
    Write-Host "❌ LICENÇA INVÁLIDA: $reason" -ForegroundColor Red
    Send-DiscordLog -SystemInfo $systemInfo -Status "REJEITADO ($($result.reason))" -LicenseKey $LicenseKey
    
    if ($result.reason -eq "BLOCKED") {
        Write-Host ""
        Write-Host "⚠️  Este hardware foi bloqueado permanentemente." -ForegroundColor Red
        Write-Host "Entre em contato no Discord para mais informações." -ForegroundColor Yellow
    }
    
    Write-Host ""
    pause
    exit 1
}

# ===== LICENÇA VÁLIDA - PROSSEGUIR =====
Write-Host "✅ LICENÇA VÁLIDA! ($($result.license_type))" -ForegroundColor Green
Send-DiscordLog -SystemInfo $systemInfo -Status "APROVADO" -LicenseKey $LicenseKey

Write-Host ""
Write-Host "🚀 Iniciando instalação do plugin..." -ForegroundColor Cyan
Write-Host ""

# ===== SEU CÓDIGO ORIGINAL AQUI (COMPLETO) =====

## Configure this
$Host.UI.RawUI.WindowTitle = "Luatools plugin installer | .gg/luatools"
$name = "luatools"
$link = "https://github.com/madoiscool/ltsteamplugin/releases/latest/download/ltsteamplugin.zip"
$milleniumTimer = 5

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

# Hidden defines
$steam = (Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam").InstallPath
$upperName = $name.Substring(0, 1).ToUpper() + $name.Substring(1).ToLower()

#### Logging defines ####
function Log {
    param ([string]$Type, [string]$Message, [boolean]$NoNewline = $false)

    $Type = $Type.ToUpper()
    switch ($Type) {
        "OK" { $foreground = "Green" }
        "INFO" { $foreground = "Cyan" }
        "ERR" { $foreground = "Red" }
        "WARN" { $foreground = "Yellow" }
        "LOG" { $foreground = "Magenta" }
        "AUX" { $foreground = "DarkGray" }
        default { $foreground = "White" }
    }

    $date = Get-Date -Format "HH:mm:ss"
    $prefix = if ($NoNewline) { "`r[$date] " } else { "[$date] " }
    Write-Host $prefix -ForegroundColor "Cyan" -NoNewline

    Write-Host [$Type] $Message -ForegroundColor $foreground -NoNewline:$NoNewline
}
Log "WARN" "Hey! Just letting you know that i'm working on a new version combining various scripts of the server"
Log "AUX" "Will include language support on THIS script too, luv y'all brazilians"
Write-Host

# To hide IEX blue box thing
$ProgressPreference = 'SilentlyContinue'

Get-Process steam -ErrorAction SilentlyContinue | Stop-Process -Force

#### Requirements part ####

# Steamtools check
$path = Join-Path $steam "xinput1_4.dll"
if ( Test-Path $path ) {
    Log "INFO" "Steamtools already installed"
}
else {
    $script = Invoke-RestMethod "https://steam.run"
    $keptLines = @()

    foreach ($line in $script -split "`n") {
        $conditions = @(
            ($line -imatch "Start-Process" -and $line -imatch "steam"),
            ($line -imatch "steam\.exe"),
            ($line -imatch "Start-Sleep" -or $line -imatch "Write-Host"),
            ($line -imatch "cls" -or $line -imatch "exit"),
            ($line -imatch "Stop-Process" -and -not ($line -imatch "Get-Process"))
        )
        
        if (-not($conditions -contains $true)) {
            $keptLines += $line
        }
    }

    $SteamtoolsScript = $keptLines -join "`n"
    Log "ERR" "Steamtools not found."
    
    for ($i = 0; $i -lt 5; $i++) {
        Log "AUX" "Install it at your own risk! Close this script if you don't want to."
        Log "WARN" "Pressing any key will install steamtools (UI-less)."
        
        [void][System.Console]::ReadKey($true)
        Write-Host
        Log "WARN" "Installing Steamtools"
        
        Invoke-Expression $SteamtoolsScript *> $null

        if ( Test-Path $path ) {
            Log "OK" "Steamtools installed"
            break
        }
        else {
            Log "ERR" "Steamtools installation failed, retrying..."
        }
    }
}

# Millenium check
$milleniumInstalling = $false
foreach ($file in @("millennium.dll", "python311.dll")) {
    if (!( Test-Path (Join-Path $steam $file) )) {
        
        Log "ERR" "Millenium not found, installation process will start in 5 seconds."
        Log "WARN" "Press any key to cancel the installation."
        
        for ($i = $milleniumTimer; $i -ge 0; $i--) {
            if ([Console]::KeyAvailable) {
                Write-Host
                Log "ERR" "Installation cancelled by user."
                exit
            }

            Log "LOG" "Installing Millenium in $i second(s)... Press any key to cancel." $true
            Start-Sleep -Seconds 1
        }
        Write-Host

        Log "INFO" "Installing millenium"
        Invoke-Expression "& { $(Invoke-RestMethod 'https://clemdotla.github.io/millennium-installer-ps1/millennium.ps1') } -NoLog -DontStart -SteamPath '$steam'"

        Log "OK" "Millenium done installing"
        $milleniumInstalling = $true
        break
    }
}
if ($milleniumInstalling -eq $false) { Log "INFO" "Millenium already installed" }

#### Plugin part ####
if (!( Test-Path (Join-Path $steam "plugins") )) {
    New-Item -Path (Join-Path $steam "plugins") -ItemType Directory *> $null
}

$Path = Join-Path $steam "plugins\$name"

foreach ($plugin in Get-ChildItem -Path (Join-Path $steam "plugins") -Directory) {
    $testpath = Join-Path $plugin.FullName "plugin.json"
    if (Test-Path $testpath) {
        $json = Get-Content $testpath -Raw | ConvertFrom-Json
        if ($json.name -eq $name) {
            Log "INFO" "Plugin already installed, updating it"
            $Path = $plugin.FullName
            break
        }
    }
}

$subPath = Join-Path $env:TEMP "$name.zip"

Log "LOG" "Downloading $name"
Invoke-WebRequest -Uri $link -OutFile $subPath *> $null
if ( !( Test-Path $subPath ) ) {
    Log "ERR" "Failed to download $name"
    exit
}
Log "LOG" "Unzipping $name"
Expand-Archive -Path $subPath -DestinationPath $Path *>$null
if ( Test-Path $subPath ) {
    Remove-Item $subPath -ErrorAction SilentlyContinue
}

Log "OK" "$upperName installed"

# Removing beta
$betaPath = Join-Path $steam "package\beta"
if ( Test-Path $betaPath ) {
    Remove-Item $betaPath -Recurse -Force
}

$cfgPath = Join-Path $steam "steam.cfg"
if ( Test-Path $cfgPath ) {
    Remove-Item $cfgPath -Recurse -Force
}
Remove-ItemProperty -Path "HKCU:\Software\Valve\Steam" -Name "SteamCmdForceX86" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Valve\Steam" -Name "SteamCmdForceX86" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -Name "SteamCmdForceX86" -ErrorAction SilentlyContinue

# Toggling the plugin on
$configPath = Join-Path $steam "ext/config.json"
if (-not (Test-Path $configPath)) {
    $config = @{
        plugins = @{
            enabledPlugins = @($name)
        }
        general = @{
            checkForMillenniumUpdates = $false
        }
    }
    New-Item -Path (Split-Path $configPath) -ItemType Directory -Force | Out-Null
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
}
else {
    $config = (Get-Content $configPath -Raw -Encoding UTF8) | ConvertFrom-Json

    function _EnsureProperty {
        param($Object, $PropertyName, $DefaultValue)
        if (-not $Object.$PropertyName) {
            $Object | Add-Member -MemberType NoteProperty -Name $PropertyName -Value $DefaultValue -Force
        }
    }

    _EnsureProperty $config "general" @{}
    _EnsureProperty $config "general.checkForMillenniumUpdates" $false
    $config.general.checkForMillenniumUpdates = $false

    _EnsureProperty $config "plugins" @{ enabledPlugins = @() }
    _EnsureProperty $config "plugins.enabledPlugins" @()
    
    $pluginsList = @($config.plugins.enabledPlugins)
    if ($pluginsList -notcontains $name) {
        $pluginsList += $name
        $config.plugins.enabledPlugins = $pluginsList
    }
    
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
}
Log "OK" "Plugin enabled"

# Result showing
Write-Host
if ($milleniumInstalling) { Log "WARN" "Steam startup will be longer, don't panic and don't touch anything in steam!" }

# Start with the "-clearbeta" argument
$exe = Join-Path $steam "steam.exe"
Start-Process $exe -ArgumentList "-clearbeta"

Log "INFO" "Starting steam"
Log "WARN" "Hey so there's a bug where steam may not start"
Log "WARN" "Hopefully this script fixes it"
Log "WARN" "But i had to turn updates of millennium off."
Log "WARN" "In future, they will come back but in the meantime:"
Log "OK" "Manually check for updates of millennium if you want up to date."
Log "AUX" "Millennium is working now tho (latest version)."

# ===== FIM DO CÓDIGO ORIGINAL =====

Write-Host ""
Write-Host "✅ Instalação concluída com sucesso!" -ForegroundColor Green
Write-Host ""
pause
