<#
  Prueba de scripts/provision-sharepoint.ps1 contra un SharePoint SIMULADO en memoria (sin red ni tenant).
  Comprueba: creación completa, idempotencia (una segunda ejecución no crea nada ni pisa la configuración),
  -WhatIf, las opciones -Omitir* y la zona horaria. NO prueba los cmdlets reales de PnP.PowerShell.

  Ejecutar (Windows PowerShell 5.1 o PowerShell 7):
      powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pruebas/provision-sharepoint.simulado.ps1
      (o:  npm run test:ps-provision)
#>
$ErrorActionPreference = 'Stop'
$script:ruta = Join-Path $PSScriptRoot '\..\provision-sharepoint.ps1'
$global:Fallos = 0
function Afirmar($condicion, $mensaje) {
    if ($condicion) { Write-Host "  PASA  $mensaje" -ForegroundColor Green }
    else { Write-Host "  FALLA $mensaje" -ForegroundColor Red; $global:Fallos++ }
}

# ------------------------------- SharePoint simulado -------------------------------
function Nuevo-Sitio {
    $global:Sitio = @{ Listas = [ordered]@{}; Grupos = @{}; Permisos = New-Object System.Collections.Generic.List[string]; ZonaHoraria = '(UTC-05:00) Bogota, Lima, Quito'; Llamadas = New-Object System.Collections.Generic.List[string] }
}
function Nueva-Lista($titulo, $plantilla) {
    $campos = [ordered]@{ Title = [pscustomobject]@{ Title = 'Title'; Indexed = $false; EnforceUniqueValues = $false; Xml = $null } }
    $global:Sitio.Listas[$titulo] = [pscustomobject]@{ Id = [guid]::NewGuid(); Title = $titulo; Plantilla = $plantilla; Campos = $campos; Items = (New-Object System.Collections.ArrayList); Vistas = (New-Object System.Collections.ArrayList); Versionado = $false; MaxVersiones = 0; Adjuntos = $true; HasUniqueRoleAssignments = $false }
    $global:Sitio.Listas[$titulo].Campos['Modified'] = [pscustomobject]@{ Title = 'Modified'; Indexed = $false; EnforceUniqueValues = $false; Xml = $null }
}
function Connect-PnPOnline { param($Url, [switch]$Interactive, $ClientId) $global:Sitio.Llamadas.Add("Connect $Url") }
function Get-PnPList { [CmdletBinding()] param($Identity) if (-not $global:Sitio.Listas.Contains($Identity)) { throw "Lista no encontrada: $Identity" }; $global:Sitio.Listas[$Identity] }
function New-PnPList { [CmdletBinding()] param($Title, $Template, [switch]$OnQuickLaunch) $global:Sitio.Llamadas.Add("New-PnPList $Title"); Nueva-Lista $Title $Template; $global:Sitio.Listas[$Title] }
function Set-PnPList { [CmdletBinding()] param($Identity, $EnableVersioning, $MajorVersions, $EnableAttachments, [switch]$BreakRoleInheritance, [switch]$CopyRoleAssignments)
    $global:Sitio.Llamadas.Add("Set-PnPList $Identity"); $l = $global:Sitio.Listas[$Identity]
    if ($PSBoundParameters.ContainsKey('EnableVersioning')) { $l.Versionado = [bool]$EnableVersioning }
    if ($PSBoundParameters.ContainsKey('MajorVersions')) { $l.MaxVersiones = $MajorVersions }
    if ($PSBoundParameters.ContainsKey('EnableAttachments')) { $l.Adjuntos = [bool]$EnableAttachments }
    if ($BreakRoleInheritance) { $l.HasUniqueRoleAssignments = $true } }
function Get-PnPField { [CmdletBinding()] param($List, $Identity) $l = $global:Sitio.Listas[$List]; if (-not $l -or -not $l.Campos.Contains($Identity)) { throw "Campo no encontrado: $List.$Identity" }; $l.Campos[$Identity] }
function Add-PnPFieldFromXml { [CmdletBinding()] param($List, $FieldXml)
    $global:Sitio.Llamadas.Add("Add-PnPFieldFromXml $List"); $x = [xml]$FieldXml; $f = $x.Field
    $nombre = $f.Name
    $unico = ($f.EnforceUniqueValues -eq 'TRUE'); $ind = ($f.Indexed -eq 'TRUE')
    $global:Sitio.Listas[$List].Campos[$nombre] = [pscustomobject]@{ Title = $f.DisplayName; Indexed = $ind; EnforceUniqueValues = $unico; Xml = $FieldXml; Tipo = $f.Type; StaticName = $f.StaticName } }
function Set-PnPField { [CmdletBinding()] param($List, $Identity, $Values) $c = $global:Sitio.Listas[$List].Campos[$Identity]
    foreach ($k in $Values.Keys) { $c.$k = $Values[$k] }; $global:Sitio.Llamadas.Add("Set-PnPField $List.$Identity") }
function Get-PnPView { [CmdletBinding()] param($List) @($global:Sitio.Listas[$List].Vistas) }
function Add-PnPView { [CmdletBinding()] param($List, $Title, $Fields, $Query)
    [void]([xml]("<Query>$Query</Query>")); $global:Sitio.Listas[$List].Vistas.Add([pscustomobject]@{ Title = $Title; Fields = $Fields }) | Out-Null; $global:Sitio.Llamadas.Add("Add-PnPView $Title") }
function Get-PnPListItem { [CmdletBinding()] param($List, $Fields, $PageSize) @($global:Sitio.Listas[$List].Items | ForEach-Object { [pscustomobject]@{ FieldValues = $_ } }) }
function Add-PnPListItem { [CmdletBinding()] param($List, $Values) $global:Sitio.Listas[$List].Items.Add($Values) | Out-Null; $global:Sitio.Llamadas.Add("Add-PnPListItem $List") }
function Get-PnPGroup { [CmdletBinding()] param($Identity) if (-not $global:Sitio.Grupos.ContainsKey($Identity)) { throw 'Grupo no encontrado' }; $global:Sitio.Grupos[$Identity] }
function New-PnPGroup { [CmdletBinding()] param($Title) $global:Sitio.Grupos[$Title] = [pscustomobject]@{ Title = $Title }; $global:Sitio.Llamadas.Add("New-PnPGroup $Title"); $global:Sitio.Grupos[$Title] }
function Set-PnPGroupPermissions { [CmdletBinding()] param($Identity, $List, $AddRole) $global:Sitio.Permisos.Add("$Identity|$List|$AddRole") }
function Get-PnPRoleDefinition { [CmdletBinding()] param() @([pscustomobject]@{ Name = 'Colaborar'; RoleTypeKind = 'Contributor' }, [pscustomobject]@{ Name = 'Leer'; RoleTypeKind = 'Reader' }, [pscustomobject]@{ Name = 'Control total'; RoleTypeKind = 'Administrator' }) }
function Get-PnPProperty { [CmdletBinding()] param($ClientObject, $Property) $ClientObject.$Property }
function Get-PnPWeb { [CmdletBinding()] param($Includes) [pscustomobject]@{ RegionalSettings = [pscustomobject]@{ TimeZone = [pscustomobject]@{ Description = $global:Sitio.ZonaHoraria } } } }
function Get-PnPTimeZoneId { [CmdletBinding()] param($Match) [pscustomobject]@{ Id = 33; Description = '(UTC-05:00) Bogota, Lima, Quito' } }
function Set-PnPRegionalSettings { [CmdletBinding()] param($TimeZone, $LocaleId) $global:Sitio.ZonaHoraria = $TimeZone.Description }

function Ejecutar([hashtable]$parametros) {
    & {
        . $script:ruta @parametros
        Invoke-Aprovisionamiento
    }
}
$base = @{ SiteUrl = 'https://acme.sharepoint.com/sites/ServicioTecnicoBC-DEV'; ClientId = '11111111-1111-4111-8111-111111111111' }

# ===================================== ESCENARIO 1: sitio vacío =====================================
Write-Host "`n##### ESCENARIO 1: primera ejecución en un sitio vacío" -ForegroundColor Magenta
Nuevo-Sitio
$null = Ejecutar ($base + @{ CorreoDestinoOT = 'ot@empresa.com'; CorreoDestinoAlertas = 'alertas@empresa.com' }) 6>&1 | Out-Null
$s = $global:Sitio
Afirmar ($s.Listas.Count -eq 6) "se crean las 6 listas/bibliotecas (hay $($s.Listas.Count))"
Afirmar ($s.Listas['ServiciosAdjuntos'].Plantilla -eq 'DocumentLibrary') 'ServiciosAdjuntos es biblioteca de documentos'
$esperadosServicios = 'ServicioId','Estado','TipoEquipo','FechaRecepcion','Cliente','NumeroSolicitud','Marca','Referencia','SerieEquipo','Diagnostico','ObservacionTecnica','FechaSocializacionDF','CotizacionFechaEnvio','CotizacionValor','CotizacionEstado','OTDetalle','OTCostoReparacion','OTCorreoEnviado','FechaEntrega','ProyeccionVidaUtil','AlertaVidaUtilNivel','FacturaNumero','FacturaFecha','CapturadoPor','CapturadoPorNombre','CapturadoEn','ActualizadoEnDispositivo','DispositivoId','AppVersion','UrlCarpetaAdjuntos','MotivoAnulacion','FechaAnulacion'
$faltan = @($esperadosServicios | Where-Object { -not $s.Listas['Servicios'].Campos.Contains($_) })
Afirmar ($faltan.Count -eq 0) "Servicios tiene las 32 columnas con su nombre interno exacto (faltan: $($faltan -join ', '))"
$srv = $s.Listas['Servicios']
Afirmar ($srv.Campos['ServicioId'].EnforceUniqueValues -and $srv.Campos['ServicioId'].Indexed) 'ServicioId es único e indexado'
Afirmar ($srv.Campos['Estado'].Indexed -and $srv.Campos['SerieEquipo'].Indexed -and $srv.Campos['NumeroSolicitud'].Indexed -and $srv.Campos['ProyeccionVidaUtil'].Indexed -and $srv.Campos['Modified'].Indexed) 'índices: Estado, SerieEquipo, NumeroSolicitud, ProyeccionVidaUtil, Modified'
Afirmar ($srv.Versionado -and $srv.MaxVersiones -eq 50 -and -not $srv.Adjuntos) 'Servicios: versiones (50) y datos adjuntos deshabilitados'
Afirmar ($srv.Campos['Title'].Title -eq 'Código') 'Servicios.Title se muestra como «Código»'
Afirmar ($srv.Vistas.Count -eq 5) "5 vistas sugeridas (hay $($srv.Vistas.Count))"
Afirmar ($s.Listas['LogSincronizacion'].Versionado -eq $false) 'LogSincronizacion sin versiones'
Afirmar ($s.Listas['ServiciosAdjuntos'].Versionado -and $s.Listas['ServiciosAdjuntos'].MaxVersiones -eq 50) 'ServiciosAdjuntos con versiones (50)'
Afirmar ($s.Listas['ServiciosAdjuntos'].Campos['ServicioId'].Indexed -and $s.Listas['ServiciosAdjuntos'].Campos['AdjuntoId'].Indexed) 'ServiciosAdjuntos: ServicioId y AdjuntoId indexadas'
Afirmar ($s.Listas['Clientes'].Items.Count -eq 3 -and $s.Listas['Marcas'].Items.Count -eq 1) 'datos iniciales: 3 clientes y 1 marca'
$cfg = @($s.Listas['ConfiguracionApp'].Items | ForEach-Object { $_['Title'] })
Afirmar ($cfg.Count -eq 19) "ConfiguracionApp: 17 claves por defecto + 2 correos (hay $($cfg.Count))"
Afirmar (($s.Listas['ConfiguracionApp'].Items | Where-Object { $_['Title'] -eq 'UmbralesAlertaDias' })['Valor'] -eq '90,60,30') 'UmbralesAlertaDias = 90,60,30'
Afirmar (($s.Listas['ConfiguracionApp'].Items | Where-Object { $_['Title'] -eq 'DiagnosticoValorDisposicionFinal' })['Valor'] -eq 'D. FINAL') 'DiagnosticoValorDisposicionFinal = D. FINAL'
Afirmar ($s.Grupos.ContainsKey('ServicioTecnico-Usuarios')) 'se crea el grupo de usuarios'
Afirmar ($s.Permisos.Count -eq 6) "6 asignaciones de permiso (hay $($s.Permisos.Count))"
Afirmar ($s.Permisos -contains 'ServicioTecnico-Usuarios|Servicios|Colaborar' -and $s.Permisos -contains 'ServicioTecnico-Usuarios|Clientes|Leer') 'Colaborar en Servicios y Leer en Clientes (nombres localizados)'
Afirmar (@($s.Listas.Values | Where-Object { -not $_.HasUniqueRoleAssignments }).Count -eq 0) 'se rompe la herencia en las 6 listas'
$xmls = @($s.Listas.Values | ForEach-Object { $_.Campos.Values } | Where-Object { $_.Xml })
$mal = @($xmls | Where-Object { $_.StaticName -ne ([xml]$_.Xml).Field.Name })
Afirmar ($xmls.Count -gt 40 -and $mal.Count -eq 0) "todos los XML de columnas son válidos (name = staticName): $($xmls.Count) columnas"
$estado = [xml]$srv.Campos['Estado'].Xml
Afirmar ((@($estado.Field.CHOICES.CHOICE) -join '|') -eq 'Recibido|Diagnosticado|Cotizado|En reparación|Entregado|Facturado|Disposición final|Anulado') 'Choice Estado con los 8 valores y sus tildes'
$diag = [xml]$srv.Campos['Diagnostico'].Xml
Afirmar ((@($diag.Field.CHOICES.CHOICE) -join '|') -eq 'Reparable|Garantía|Sin falla|D. FINAL' -and $diag.Field.FillInChoice -eq 'FALSE') 'Choice Diagnostico (sin rellenar libre)'
$fecha = [xml]$srv.Campos['FechaRecepcion'].Xml
Afirmar ($fecha.Field.Format -eq 'DateOnly') 'FechaRecepcion es de solo fecha'
$moneda = [xml]$srv.Campos['CotizacionValor'].Xml
Afirmar ($moneda.Field.Type -eq 'Currency' -and $moneda.Field.LCID -eq '9226' -and $moneda.Field.Decimals -eq '0') 'CotizacionValor: moneda es-CO sin decimales'
$look = [xml]$srv.Campos['Cliente'].Xml
Afirmar ($look.Field.List -eq ('{' + $s.Listas['Clientes'].Id + '}')) 'Cliente es una búsqueda a la lista Clientes'
$sid = [xml]$srv.Campos['ServicioId'].Xml
Afirmar ($sid.Field.Required -eq 'TRUE') 'ServicioId obligatorio'

# ===================================== ESCENARIO 2: idempotencia ====================================
Write-Host "`n##### ESCENARIO 2: segunda ejecución (nada nuevo)" -ForegroundColor Magenta
$s.Llamadas.Clear()
# Un administrador cambió un valor: no debe pisarse.
($s.Listas['ConfiguracionApp'].Items | Where-Object { $_['Title'] -eq 'MaxFotosIngreso' })['Valor'] = '8'
$conteo = @{}; foreach ($n in $s.Listas.Keys) { $conteo[$n] = @{ Campos = $s.Listas[$n].Campos.Count; Items = $s.Listas[$n].Items.Count; Vistas = $s.Listas[$n].Vistas.Count } }
$null = Ejecutar ($base + @{ CorreoDestinoOT = 'ot@empresa.com'; CorreoDestinoAlertas = 'alertas@empresa.com' }) 6>&1 | Out-Null
$creaciones = @($s.Llamadas | Where-Object { $_ -match '^(New-PnPList|Add-PnPFieldFromXml|Add-PnPView|Add-PnPListItem|New-PnPGroup|Set-PnPField)' })
Afirmar ($creaciones.Count -eq 0) "no crea nada (llamadas de creación: $($creaciones -join '; '))"
$igual = $true; foreach ($n in $s.Listas.Keys) { if ($s.Listas[$n].Campos.Count -ne $conteo[$n].Campos -or $s.Listas[$n].Items.Count -ne $conteo[$n].Items -or $s.Listas[$n].Vistas.Count -ne $conteo[$n].Vistas) { $igual = $false } }
Afirmar $igual 'el número de columnas, elementos y vistas no cambia'
Afirmar (($s.Listas['ConfiguracionApp'].Items | Where-Object { $_['Title'] -eq 'MaxFotosIngreso' })['Valor'] -eq '8') 'no pisa un valor de configuración cambiado por un administrador'

# ===================================== ESCENARIO 3: -WhatIf ==========================================
Write-Host "`n##### ESCENARIO 3: -WhatIf en un sitio vacío" -ForegroundColor Magenta
Nuevo-Sitio
$null = Ejecutar ($base + @{ WhatIf = $true }) 6>&1 | Out-Null
Afirmar ($global:Sitio.Listas.Count -eq 0 -and $global:Sitio.Grupos.Count -eq 0 -and $global:Sitio.Permisos.Count -eq 0) 'con -WhatIf no se crea nada'
$mutaciones = @($global:Sitio.Llamadas | Where-Object { $_ -match '^(New-|Add-|Set-)' })
Afirmar ($mutaciones.Count -eq 0) "con -WhatIf no se llama a ningún cmdlet que modifique ($($mutaciones -join '; '))"

# ===================================== ESCENARIO 4: opciones ========================================
Write-Host "`n##### ESCENARIO 4: omitir permisos, datos y vistas; sin correos" -ForegroundColor Magenta
Nuevo-Sitio
$salida = Ejecutar ($base + @{ OmitirPermisos = $true; OmitirDatosIniciales = $true; OmitirVistas = $true }) 6>&1
$s = $global:Sitio
Afirmar ($s.Grupos.Count -eq 0 -and $s.Permisos.Count -eq 0) '-OmitirPermisos no crea grupo ni permisos'
Afirmar ($s.Listas['Clientes'].Items.Count -eq 0 -and $s.Listas['Marcas'].Items.Count -eq 0) '-OmitirDatosIniciales no carga datos'
Afirmar ($s.Listas['Servicios'].Vistas.Count -eq 0) '-OmitirVistas no crea vistas'
$cfg = @($s.Listas['ConfiguracionApp'].Items | ForEach-Object { $_['Title'] })
Afirmar ($cfg.Count -eq 17 -and $cfg -notcontains 'CorreoDestinoOT') 'sin correos: no crea claves CorreoDestino* vacías (la app las rechaza vacías)'
Afirmar (@($salida | Where-Object { "$_" -match 'CorreoDestinoOT' }).Count -ge 1) 'avisa de que falta CorreoDestinoOT'

# ===================================== ESCENARIO 5: zona horaria ====================================
Write-Host "`n##### ESCENARIO 5: zona horaria incorrecta" -ForegroundColor Magenta
Nuevo-Sitio; $global:Sitio.ZonaHoraria = '(UTC-08:00) Pacific Time (US and Canada)'
$salida = Ejecutar ($base + @{ OmitirPermisos = $true }) 6>&1
Afirmar (@($salida | Where-Object { "$_" -match 'zona horaria' -and "$_" -match 'Pacific' }).Count -ge 1) 'avisa si la zona horaria no es Bogotá'
Nuevo-Sitio; $global:Sitio.ZonaHoraria = '(UTC-08:00) Pacific Time (US and Canada)'
$null = Ejecutar ($base + @{ OmitirPermisos = $true; ConfigurarRegional = $true }) 6>&1 | Out-Null
Afirmar ($global:Sitio.ZonaHoraria -match '-05:00') 'con -ConfigurarRegional fija la zona horaria de Bogotá'

Write-Host ''
if ($global:Fallos -eq 0) { Write-Host 'TODAS LAS COMPROBACIONES PASAN' -ForegroundColor Green; exit 0 } else { Write-Host "$($global:Fallos) COMPROBACIONES FALLAN" -ForegroundColor Red; exit 1 }
