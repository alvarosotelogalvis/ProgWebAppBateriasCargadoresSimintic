<#
.SYNOPSIS
  Aprovisiona en SharePoint Online las listas, la biblioteca, las columnas, los índices, las versiones,
  las vistas, los datos iniciales y las claves de configuración que usa la PWA de Servicio Técnico.

.DESCRIPTION
  Implementa docs/06-Configuracion-Tenant-M365.md §2 y docs/03-Modelo-de-Datos.md §6-§7 con PnP.PowerShell.
  Es IDEMPOTENTE: lo que ya existe no se duplica ni se modifica (tampoco los valores de ConfiguracionApp que
  un administrador haya cambiado). Se puede ejecutar de nuevo sin riesgo.

  Qué crea:
    - Listas: Clientes, Marcas, Servicios, ConfiguracionApp, LogSincronizacion.
    - Biblioteca: ServiciosAdjuntos.
    - Columnas con su NOMBRE INTERNO exacto (el que usa la app), índices, columna única ServicioId,
      versionado (50) y datos adjuntos deshabilitados en Servicios.
    - Vistas sugeridas de Servicios, datos iniciales (clientes, marca) y claves de ConfiguracionApp.
    - Grupo de usuarios con permisos (Colaborar / Leer) según el §2.5.

  Qué NO hace: crear el sitio, el App Registration ni conceder Sites.Selected a la app (docs/06 §1 y §2.1),
  ni los flujos de Power Automate.

.PARAMETER SiteUrl
  URL del sitio ya creado. Ej.: https://contoso.sharepoint.com/sites/ServicioTecnicoBC-DEV

.PARAMETER ClientId
  Id de la aplicación (App Registration) de PnP.PowerShell con la que inicia sesión QUIEN EJECUTA el script
  (no es el de la PWA). La cuenta debe ser propietaria del sitio.

.PARAMETER GrupoUsuarios
  Grupo de SharePoint de los usuarios de la app. Por defecto: ServicioTecnico-Usuarios.

.PARAMETER CorreoDestinoOT
  Correo(s) separados por ';' para la clave CorreoDestinoOT (Power Automate). Si se omite, la clave NO se crea:
  la app valida que no esté vacía; créala cuando tengas el correo.

.PARAMETER CorreoDestinoAlertas
  Igual que CorreoDestinoOT, para CorreoDestinoAlertas.

.PARAMETER OmitirPermisos
  No toca los permisos (no crea el grupo ni rompe la herencia).

.PARAMETER OmitirDatosIniciales
  No carga los clientes ni la marca iniciales.

.PARAMETER OmitirVistas
  No crea las vistas sugeridas.

.PARAMETER ConfigurarRegional
  Intenta fijar la zona horaria (UTC-05:00 Bogotá) y la configuración regional (es-CO) del sitio. Si no se usa,
  solo se comprueba y se avisa.

.EXAMPLE
  ./scripts/provision-sharepoint.ps1 -SiteUrl https://contoso.sharepoint.com/sites/ServicioTecnicoBC-DEV `
      -ClientId 00000000-0000-0000-0000-000000000000 -WhatIf

  Muestra lo que haría, sin cambiar nada.

.EXAMPLE
  ./scripts/provision-sharepoint.ps1 -SiteUrl https://contoso.sharepoint.com/sites/ServicioTecnicoBC-DEV `
      -ClientId 00000000-0000-0000-0000-000000000000 -CorreoDestinoOT ot@empresa.com -CorreoDestinoAlertas alertas@empresa.com

.NOTES
  Requiere PowerShell 7.2+ y el módulo PnP.PowerShell 2.x:  Install-Module PnP.PowerShell -Scope CurrentUser
  El ClientId de PnP se registra una vez:  Register-PnPEntraIDAppForInteractiveLogin -ApplicationName "PnP-Provision" -Tenant <tenant>.onmicrosoft.com
  El archivo está en UTF-8 con BOM: las tildes de los valores de Choice deben respetarse tal cual.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)] [string] $SiteUrl,
    [Parameter(Mandatory = $true)] [string] $ClientId,
    [string] $GrupoUsuarios = 'ServicioTecnico-Usuarios',
    [string] $CorreoDestinoOT,
    [string] $CorreoDestinoAlertas,
    [switch] $OmitirPermisos,
    [switch] $OmitirDatosIniciales,
    [switch] $OmitirVistas,
    [switch] $ConfigurarRegional
)

$ErrorActionPreference = 'Stop'

# ----------------------------------------------------------------------------------------------------
# Contadores y mensajes
# ----------------------------------------------------------------------------------------------------
$script:Creado = 0
$script:Existente = 0
$script:Advertencias = New-Object System.Collections.Generic.List[string]
$script:Simulacion = [bool]$WhatIfPreference

function Write-Paso([string] $Texto) { Write-Host ''; Write-Host "== $Texto" -ForegroundColor Cyan }
function Write-Creado([string] $Texto) { $script:Creado++; Write-Host "  [creado]    $Texto" -ForegroundColor Green }
function Write-Existente([string] $Texto) { $script:Existente++; Write-Host "  [ya existe] $Texto" -ForegroundColor DarkGray }
function Write-Simulado([string] $Texto) { Write-Host "  [simulación] $Texto" -ForegroundColor Yellow }
function Write-Aviso([string] $Texto) { $script:Advertencias.Add($Texto); Write-Host "  [aviso]     $Texto" -ForegroundColor Yellow }

# ----------------------------------------------------------------------------------------------------
# DEFINICIONES (fuente de verdad: docs/03-Modelo-de-Datos.md y docs/06 §2.3).
# Los nombres internos (N) deben coincidir con los de src/infrastructure/graph/mappers/servicioMapper.ts;
# una prueba automática (provisionSharepoint.test.ts) lo comprueba.
#   T: Text | Note | Choice | Date (solo fecha) | DateTime | Number | Currency | Boolean | Lookup
# ----------------------------------------------------------------------------------------------------
$EstadosServicio = @('Recibido', 'Diagnosticado', 'Cotizado', 'En reparación', 'Entregado', 'Facturado', 'Disposición final', 'Anulado')

$CamposServicios = @(
    @{ N = 'ServicioId';               D = 'ServicioId';                   T = 'Text';     Max = 40; Obligatorio = $true; Unico = $true }
    @{ N = 'Estado';                   D = 'Estado';                       T = 'Choice';   Opciones = $EstadosServicio; Indice = $true }
    @{ N = 'TipoEquipo';               D = 'Tipo de equipo';               T = 'Choice';   Opciones = @('Batería', 'Cargador') }
    @{ N = 'FechaRecepcion';           D = 'Fecha de recepción';           T = 'Date' }
    @{ N = 'Cliente';                  D = 'Cliente';                      T = 'Lookup';   Lista = 'Clientes'; MostrarCampo = 'Title' }
    @{ N = 'NumeroSolicitud';          D = 'Número de solicitud';          T = 'Number';   Indice = $true }
    @{ N = 'Marca';                    D = 'Marca';                        T = 'Text';     Max = 60 }
    @{ N = 'Referencia';               D = 'Referencia';                   T = 'Text';     Max = 50 }
    @{ N = 'SerieEquipo';              D = 'Serie del equipo';             T = 'Text';     Max = 50; Indice = $true }
    @{ N = 'Diagnostico';              D = 'Diagnóstico';                  T = 'Choice';   Opciones = @('Reparable', 'Garantía', 'Sin falla', 'D. FINAL') }
    @{ N = 'ObservacionTecnica';       D = 'Observación técnica';          T = 'Note' }
    @{ N = 'FechaSocializacionDF';     D = 'Fecha de socialización DF';    T = 'Date' }
    @{ N = 'CotizacionFechaEnvio';     D = 'Cotización: fecha de envío';   T = 'Date' }
    @{ N = 'CotizacionValor';          D = 'Cotización: valor';            T = 'Currency' }
    @{ N = 'CotizacionEstado';         D = 'Cotización: estado';           T = 'Choice';   Opciones = @('Pendiente', 'Aprobada', 'Rechazada') }
    @{ N = 'OTDetalle';                D = 'OT: detalle';                  T = 'Note' }
    @{ N = 'OTCostoReparacion';        D = 'OT: costo de reparación';      T = 'Currency' }
    @{ N = 'OTCorreoEnviado';          D = 'OT: correo enviado';           T = 'Boolean';  Defecto = '0' }
    @{ N = 'FechaEntrega';             D = 'Fecha de entrega';             T = 'Date' }
    @{ N = 'ProyeccionVidaUtil';       D = 'Proyección de vida útil';      T = 'Date';     Indice = $true }
    @{ N = 'AlertaVidaUtilNivel';      D = 'Alerta de vida útil';          T = 'Choice';   Opciones = @('Ninguna', '90', '60', '30', 'Vencida'); Defecto = 'Ninguna' }
    @{ N = 'FacturaNumero';            D = 'Factura: número';              T = 'Text';     Max = 30 }
    @{ N = 'FacturaFecha';             D = 'Factura: fecha';               T = 'Date' }
    @{ N = 'CapturadoPor';             D = 'Capturado por';                T = 'Text' }
    @{ N = 'CapturadoPorNombre';       D = 'Capturado por (nombre)';       T = 'Text' }
    @{ N = 'CapturadoEn';              D = 'Capturado en';                 T = 'DateTime' }
    @{ N = 'ActualizadoEnDispositivo'; D = 'Actualizado en dispositivo';   T = 'DateTime' }
    @{ N = 'DispositivoId';            D = 'Dispositivo';                  T = 'Text' }
    @{ N = 'AppVersion';               D = 'Versión de la app';            T = 'Text' }
    @{ N = 'UrlCarpetaAdjuntos';       D = 'URL de la carpeta de adjuntos'; T = 'Note' }
    @{ N = 'MotivoAnulacion';          D = 'Motivo de anulación';          T = 'Note' }
    @{ N = 'FechaAnulacion';           D = 'Fecha de anulación';           T = 'Date' }
)

$CamposClientes = @(
    @{ N = 'NIT';            D = 'NIT';                 T = 'Text' }
    @{ N = 'Activo';         D = 'Activo';              T = 'Boolean'; Defecto = '1' }
    @{ N = 'CorreoContacto'; D = 'Correo de contacto';  T = 'Text' }
)

$CamposMarcas = @(
    @{ N = 'Activo'; D = 'Activo'; T = 'Boolean'; Defecto = '1' }
)

$CamposConfiguracion = @(
    @{ N = 'Valor';       D = 'Valor';       T = 'Note' }
    @{ N = 'Descripcion'; D = 'Descripción'; T = 'Note' }
)

$CamposLog = @(
    @{ N = 'Usuario';              D = 'Usuario';                T = 'Text' }
    @{ N = 'Dispositivo';          D = 'Dispositivo';            T = 'Text' }
    @{ N = 'AppVersion';           D = 'Versión de la app';      T = 'Text' }
    @{ N = 'Inicio';               D = 'Inicio';                 T = 'DateTime' }
    @{ N = 'Fin';                  D = 'Fin';                    T = 'DateTime' }
    @{ N = 'Resultado';            D = 'Resultado';              T = 'Choice'; Opciones = @('OK', 'Parcial', 'Error') }
    @{ N = 'ServiciosSubidos';     D = 'Servicios subidos';      T = 'Number' }
    @{ N = 'ArchivosSubidos';      D = 'Archivos subidos';       T = 'Number' }
    @{ N = 'ServiciosDescargados'; D = 'Servicios descargados';  T = 'Number' }
    @{ N = 'Conflictos';           D = 'Conflictos';             T = 'Number' }
    @{ N = 'Errores';              D = 'Errores';                T = 'Note' }
)

$CamposAdjuntos = @(
    @{ N = 'ServicioId';   D = 'ServicioId';    T = 'Text'; Max = 40; Indice = $true }
    @{ N = 'AdjuntoId';    D = 'AdjuntoId';     T = 'Text'; Max = 40; Indice = $true }
    @{ N = 'TipoAdjunto';  D = 'Tipo de adjunto'; T = 'Choice'; Opciones = @('Foto ingreso', 'Foto salida', 'Formato diagnóstico', 'Cotización', 'Factura', 'Disposición final') }
    @{ N = 'FechaCaptura'; D = 'Fecha de captura'; T = 'DateTime' }
    @{ N = 'CapturadoPor'; D = 'Capturado por';  T = 'Text' }
)

$ClientesIniciales = @('NAVAR ASOCIADOS', 'ARIS MINING SEGOVIA', 'ARIS MINING MARMATO')
$MarcasIniciales = @('ROQUET')

# Claves de ConfiguracionApp con su valor por defecto (docs/03 §6.3; deben coincidir con src/domain/config.ts).
$ConfiguracionPorDefecto = [ordered]@{
    VersionMinimaApp                 = @('1.0.0', 'Bloquea la sincronización en versiones menores.')
    SyncModoAutenticacion            = @('confirmar', 'confirmar | reautenticar. reautenticar = login interactivo en cada sincronización.')
    SyncReautenticacionHoras         = @('12', 'Horas máximas desde el último login interactivo en modo confirmar.')
    MinFotosIngreso                  = @('1', 'Mínimo de fotos de ingreso.')
    MaxFotosIngreso                  = @('5', 'Máximo de fotos de ingreso.')
    MinFotosSalida                   = @('1', 'Mínimo de fotos de salida.')
    MaxFotosSalida                   = @('10', 'Máximo de fotos de salida.')
    MaxTamanoPdfMB                   = @('20', 'Tamaño máximo de un PDF, en MB.')
    ImagenMaxLadoPx                  = @('1920', 'Lado mayor máximo de la foto optimizada, en píxeles.')
    ImagenCalidad                    = @('0.75', 'Calidad JPEG de la foto optimizada (0 a 1).')
    VidaUtilMesesDefecto             = @('12', 'Meses sugeridos para la proyección de vida útil.')
    UmbralesAlertaDias               = @('90,60,30', 'Umbrales de alerta de vida útil, en días (CSV). Los usan la app y el flujo.')
    RetencionCerradosMeses           = @('3', 'Meses que se conservan localmente los servicios cerrados.')
    RetencionOriginalesDias          = @('7', 'Días que se conserva el archivo original ya sincronizado.')
    DescargarMiniaturasRemotas       = @('true', 'true | false. Solo para servicios abiertos.')
    DiagnosticoValorDisposicionFinal = @('D. FINAL', 'Valor de Diagnostico que significa disposición final.')
    RecordatorioPendientesHoras      = @('24', 'Horas tras las que se avisa de pendientes antiguos.')
}

# Permisos (docs/06 §2.5): lista -> rol del grupo de usuarios (Contribute = Colaborar, Read = Leer).
$PermisosPorLista = [ordered]@{
    Servicios         = 'Contribute'
    ServiciosAdjuntos = 'Contribute'
    LogSincronizacion = 'Contribute'
    Clientes          = 'Read'
    Marcas            = 'Read'
    ConfiguracionApp  = 'Read'
}

# ----------------------------------------------------------------------------------------------------
# XML de cada columna (se usa el XML para fijar el NOMBRE INTERNO exacto: docs/06 §2.2)
# ----------------------------------------------------------------------------------------------------
function Get-XmlCampo {
    param([hashtable] $Campo, [string] $IdListaLookup)

    $esc = { param($v) [System.Security.SecurityElement]::Escape([string]$v) }
    $nombre = & $esc $Campo.N
    $visible = & $esc $Campo.D
    $id = '{' + ([guid]::NewGuid().ToString()) + '}'
    $obligatorio = 'FALSE'; if ($Campo.ContainsKey('Obligatorio') -and $Campo.Obligatorio) { $obligatorio = 'TRUE' }
    $comunes = 'ID="' + $id + '" Name="' + $nombre + '" StaticName="' + $nombre + '" DisplayName="' + $visible + '" Required="' + $obligatorio + '"'

    $unico = ''
    if ($Campo.ContainsKey('Unico') -and $Campo.Unico) { $unico = ' EnforceUniqueValues="TRUE" Indexed="TRUE"' }

    switch ($Campo.T) {
        'Text' {
            $max = 255; if ($Campo.ContainsKey('Max')) { $max = $Campo.Max }
            return '<Field Type="Text" ' + $comunes + ' MaxLength="' + $max + '"' + $unico + ' />'
        }
        'Note' {
            return '<Field Type="Note" ' + $comunes + ' NumLines="6" RichText="FALSE" />'
        }
        'Choice' {
            $opciones = ($Campo.Opciones | ForEach-Object { '<CHOICE>' + (& $esc $_) + '</CHOICE>' }) -join ''
            $defecto = ''
            if ($Campo.ContainsKey('Defecto')) { $defecto = '<Default>' + (& $esc $Campo.Defecto) + '</Default>' }
            return '<Field Type="Choice" ' + $comunes + ' Format="Dropdown" FillInChoice="FALSE">' + $defecto + '<CHOICES>' + $opciones + '</CHOICES></Field>'
        }
        'Date' {
            return '<Field Type="DateTime" ' + $comunes + ' Format="DateOnly" />'
        }
        'DateTime' {
            return '<Field Type="DateTime" ' + $comunes + ' Format="DateTime" />'
        }
        'Number' {
            return '<Field Type="Number" ' + $comunes + ' Decimals="0" />'
        }
        'Currency' {
            # LCID 9226 = Español (Colombia); sin decimales.
            return '<Field Type="Currency" ' + $comunes + ' Decimals="0" LCID="9226" />'
        }
        'Boolean' {
            $defecto = '0'; if ($Campo.ContainsKey('Defecto')) { $defecto = $Campo.Defecto }
            return '<Field Type="Boolean" ' + $comunes + '><Default>' + $defecto + '</Default></Field>'
        }
        'Lookup' {
            return '<Field Type="Lookup" ' + $comunes + ' List="{' + $IdListaLookup + '}" ShowField="' + (& $esc $Campo.MostrarCampo) + '" />'
        }
        default { throw "Tipo de columna desconocido: $($Campo.T) ($($Campo.N))" }
    }
}

# ----------------------------------------------------------------------------------------------------
# Operaciones idempotentes
# ----------------------------------------------------------------------------------------------------
function Get-ListaSiExiste([string] $Nombre) {
    try { return Get-PnPList -Identity $Nombre -ErrorAction Stop } catch { return $null }
}

function Get-CampoSiExiste([string] $Lista, [string] $Nombre) {
    try { return Get-PnPField -List $Lista -Identity $Nombre -ErrorAction Stop } catch { return $null }
}

function Confirm-Lista {
    param([string] $Nombre, [ValidateSet('GenericList', 'DocumentLibrary')] [string] $Plantilla = 'GenericList')
    $lista = Get-ListaSiExiste $Nombre
    if ($lista) { Write-Existente "lista/biblioteca $Nombre"; return $lista }
    if ($script:Simulacion) { Write-Simulado "crearía $Plantilla $Nombre"; return $null }
    $lista = New-PnPList -Title $Nombre -Template $Plantilla -OnQuickLaunch -ErrorAction Stop
    Write-Creado "lista/biblioteca $Nombre"
    return $lista
}

function Confirm-Campos {
    param([string] $Lista, [object[]] $Campos)
    foreach ($campo in $Campos) {
        $nombre = $campo.N
        if (Get-CampoSiExiste $Lista $nombre) { Write-Existente "columna $Lista.$nombre"; continue }
        if ($script:Simulacion) { Write-Simulado "crearía la columna $Lista.$nombre ($($campo.T))"; continue }
        $idLookup = $null
        if ($campo.T -eq 'Lookup') { $idLookup = (Get-PnPList -Identity $campo.Lista -ErrorAction Stop).Id.ToString() }
        $xml = Get-XmlCampo -Campo $campo -IdListaLookup $idLookup
        Add-PnPFieldFromXml -List $Lista -FieldXml $xml -ErrorAction Stop | Out-Null
        Write-Creado "columna $Lista.$nombre ($($campo.T))"
    }
}

function Confirm-Indices {
    param([string] $Lista, [string[]] $Campos)
    foreach ($nombre in $Campos) {
        $campo = Get-CampoSiExiste $Lista $nombre
        if (-not $campo) {
            if ($script:Simulacion) { Write-Simulado "indexaría $Lista.$nombre"; continue }
            throw "No se puede indexar ${Lista}.${nombre}: la columna no existe."
        }
        if ($campo.Indexed) { Write-Existente "índice $Lista.$nombre"; continue }
        if ($script:Simulacion) { Write-Simulado "indexaría $Lista.$nombre"; continue }
        Set-PnPField -List $Lista -Identity $nombre -Values @{ Indexed = $true } -ErrorAction Stop | Out-Null
        Write-Creado "índice $Lista.$nombre"
    }
}

function Rename-Titulo {
    param([string] $Lista, [string] $Nombre)
    if ($script:Simulacion) { Write-Simulado "renombraría Title de $Lista a '$Nombre'"; return }
    $titulo = Get-PnPField -List $Lista -Identity 'Title' -ErrorAction Stop
    if ($titulo.Title -eq $Nombre) { Write-Existente "Title de $Lista ya se llama '$Nombre'"; return }
    Set-PnPField -List $Lista -Identity 'Title' -Values @{ Title = $Nombre } -ErrorAction Stop | Out-Null
    Write-Creado "Title de $Lista renombrado a '$Nombre'"
}

function Set-Versionado {
    param([string] $Lista, [bool] $Activo, [int] $Versiones = 50, [bool] $AdjuntosDeshabilitados = $false)
    if ($script:Simulacion) { Write-Simulado "configuraría versiones de $Lista (activo=$Activo, $Versiones)"; return }
    $parametros = @{ Identity = $Lista; EnableVersioning = $Activo; ErrorAction = 'Stop' }
    if ($Activo) { $parametros.MajorVersions = $Versiones }
    if ($AdjuntosDeshabilitados) { $parametros.EnableAttachments = $false }
    Set-PnPList @parametros | Out-Null
    Write-Host "  [config]    ${Lista}: versiones=$Activo $(if ($Activo) { "($Versiones)" })$(if ($AdjuntosDeshabilitados) { ', datos adjuntos deshabilitados' })"
}

function Confirm-ItemsPorTitulo {
    param([string] $Lista, [string[]] $Titulos, [hashtable] $ValoresComunes = @{})
    if ($script:Simulacion -and -not (Get-ListaSiExiste $Lista)) { Write-Simulado "cargaría $($Titulos.Count) elementos en $Lista"; return }
    $existentes = @(Get-PnPListItem -List $Lista -Fields 'Title' -PageSize 500 -ErrorAction Stop | ForEach-Object { $_.FieldValues['Title'] })
    foreach ($titulo in $Titulos) {
        if ($existentes -contains $titulo) { Write-Existente "${Lista}: $titulo"; continue }
        if ($script:Simulacion) { Write-Simulado "agregaría ${Lista}: $titulo"; continue }
        $valores = @{ Title = $titulo }
        foreach ($clave in $ValoresComunes.Keys) { $valores[$clave] = $ValoresComunes[$clave] }
        Add-PnPListItem -List $Lista -Values $valores -ErrorAction Stop | Out-Null
        Write-Creado "${Lista}: $titulo"
    }
}

function Confirm-Configuracion {
    if ($script:Simulacion -and -not (Get-ListaSiExiste 'ConfiguracionApp')) { Write-Simulado 'cargaría las claves de ConfiguracionApp'; return }
    $existentes = @(Get-PnPListItem -List 'ConfiguracionApp' -Fields 'Title' -PageSize 500 -ErrorAction Stop | ForEach-Object { $_.FieldValues['Title'] })

    $claves = [ordered]@{}
    foreach ($clave in $ConfiguracionPorDefecto.Keys) { $claves[$clave] = $ConfiguracionPorDefecto[$clave] }
    if ($CorreoDestinoOT) { $claves['CorreoDestinoOT'] = @($CorreoDestinoOT, 'Correo(s) destino del correo de la orden de trabajo (Power Automate), separados por ;') }
    if ($CorreoDestinoAlertas) { $claves['CorreoDestinoAlertas'] = @($CorreoDestinoAlertas, 'Correo(s) destino de las alertas de vida útil (Power Automate), separados por ;') }

    foreach ($clave in $claves.Keys) {
        # Nunca se sobrescribe una clave existente: un administrador pudo haber cambiado su valor.
        if ($existentes -contains $clave) { Write-Existente "ConfiguracionApp: $clave"; continue }
        if ($script:Simulacion) { Write-Simulado "agregaría la clave $clave = $($claves[$clave][0])"; continue }
        Add-PnPListItem -List 'ConfiguracionApp' -Values @{ Title = $clave; Valor = $claves[$clave][0]; Descripcion = $claves[$clave][1] } -ErrorAction Stop | Out-Null
        Write-Creado "ConfiguracionApp: $clave = $($claves[$clave][0])"
    }
    if (-not $CorreoDestinoOT -and ($existentes -notcontains 'CorreoDestinoOT')) {
        Write-Aviso 'Falta la clave CorreoDestinoOT (la usa Power Automate). Créala con -CorreoDestinoOT o a mano en ConfiguracionApp.'
    }
    if (-not $CorreoDestinoAlertas -and ($existentes -notcontains 'CorreoDestinoAlertas')) {
        Write-Aviso 'Falta la clave CorreoDestinoAlertas (la usa Power Automate). Créala con -CorreoDestinoAlertas o a mano en ConfiguracionApp.'
    }
}

# ----------------------------------------------------------------------------------------------------
# Vistas sugeridas de Servicios (docs/06 §2.4)
# ----------------------------------------------------------------------------------------------------
function Confirm-Vistas {
    $lista = 'Servicios'
    $camposVista = @('LinkTitle', 'Estado', 'Cliente', 'TipoEquipo', 'SerieEquipo', 'NumeroSolicitud', 'FechaRecepcion', 'ProyeccionVidaUtil', 'Modified')
    $neq = { param($valor) '<Neq><FieldRef Name="Estado" /><Value Type="Choice">' + $valor + '</Value></Neq>' }
    $eq = { param($valor) '<Eq><FieldRef Name="Estado" /><Value Type="Choice">' + $valor + '</Value></Eq>' }

    $vistas = [ordered]@{
        'Abiertos por estado'     = '<Where><And><And>' + (& $neq 'Facturado') + (& $neq 'Disposición final') + '</And>' + (& $neq 'Anulado') + '</And></Where><GroupBy Collapse="FALSE" GroupLimit="30"><FieldRef Name="Estado" /></GroupBy>'
        'Por cliente'             = '<GroupBy Collapse="TRUE" GroupLimit="30"><FieldRef Name="Cliente" /></GroupBy><OrderBy><FieldRef Name="Modified" Ascending="FALSE" /></OrderBy>'
        'Vida útil próxima'       = '<Where><And><Leq><FieldRef Name="ProyeccionVidaUtil" /><Value Type="DateTime"><Today OffsetDays="90" /></Value></Leq><Or>' + (& $eq 'Entregado') + (& $eq 'Facturado') + '</Or></And></Where><OrderBy><FieldRef Name="ProyeccionVidaUtil" Ascending="TRUE" /></OrderBy>'
        'Pendientes de facturar'  = '<Where>' + (& $eq 'Entregado') + '</Where><OrderBy><FieldRef Name="Modified" Ascending="FALSE" /></OrderBy>'
        'Disposiciones finales'   = '<Where>' + (& $eq 'Disposición final') + '</Where><OrderBy><FieldRef Name="Modified" Ascending="FALSE" /></OrderBy>'
    }

    $existentes = @()
    if (Get-ListaSiExiste $lista) { $existentes = @(Get-PnPView -List $lista -ErrorAction Stop | ForEach-Object { $_.Title }) }

    foreach ($titulo in $vistas.Keys) {
        if ($existentes -contains $titulo) { Write-Existente "vista $lista`: $titulo"; continue }
        if ($script:Simulacion) { Write-Simulado "crearía la vista $lista`: $titulo"; continue }
        Add-PnPView -List $lista -Title $titulo -Fields $camposVista -Query $vistas[$titulo] -ErrorAction Stop | Out-Null
        Write-Creado "vista $lista`: $titulo"
    }
}

# ----------------------------------------------------------------------------------------------------
# Permisos (docs/06 §2.5)
# ----------------------------------------------------------------------------------------------------
function Resolve-NombreRol {
    param([ValidateSet('Contribute', 'Read')] [string] $Tipo)
    # El nombre del nivel de permiso depende del idioma del sitio (Colaborar / Leer en español).
    $candidatos = @{ Contribute = @('Contribute', 'Colaborar'); Read = @('Read', 'Leer') }[$Tipo]
    $definiciones = @(Get-PnPRoleDefinition -ErrorAction Stop)
    foreach ($definicion in $definiciones) {
        if ($definicion.RoleTypeKind -and $definicion.RoleTypeKind.ToString() -eq $(if ($Tipo -eq 'Contribute') { 'Contributor' } else { 'Reader' })) { return $definicion.Name }
    }
    foreach ($definicion in $definiciones) { if ($candidatos -contains $definicion.Name) { return $definicion.Name } }
    throw "No se encontró el nivel de permiso '$Tipo' en el sitio."
}

function Confirm-Permisos {
    if ($script:Simulacion) {
        Write-Simulado "crearía el grupo '$GrupoUsuarios' y le daría Colaborar/Leer según el §2.5 (rompe la herencia de cada lista, copiando los permisos actuales)"
        return
    }
    $grupo = $null
    try { $grupo = Get-PnPGroup -Identity $GrupoUsuarios -ErrorAction Stop } catch { $grupo = $null }
    if ($grupo) { Write-Existente "grupo $GrupoUsuarios" }
    else { New-PnPGroup -Title $GrupoUsuarios -ErrorAction Stop | Out-Null; Write-Creado "grupo $GrupoUsuarios" }

    foreach ($lista in $PermisosPorLista.Keys) {
        $objeto = Get-PnPList -Identity $lista -ErrorAction Stop
        $unica = Get-PnPProperty -ClientObject $objeto -Property HasUniqueRoleAssignments -ErrorAction Stop
        if (-not $unica) {
            Set-PnPList -Identity $lista -BreakRoleInheritance -CopyRoleAssignments -ErrorAction Stop | Out-Null
            Write-Creado "herencia de permisos rota en $lista"
        }
        else { Write-Existente "permisos propios en $lista" }
        $rol = Resolve-NombreRol -Tipo $PermisosPorLista[$lista]
        Set-PnPGroupPermissions -Identity $GrupoUsuarios -List $lista -AddRole $rol -ErrorAction Stop | Out-Null
        Write-Host "  [permiso]   $GrupoUsuarios -> $rol en $lista"
    }
    Write-Aviso "Agrega a los usuarios (o al grupo de seguridad de Entra) al grupo '$GrupoUsuarios'. Debe coincidir con las asignaciones de la Enterprise App."
}

# ----------------------------------------------------------------------------------------------------
# Zona horaria y regional (docs/06 §2.1): una zona distinta de Bogotá cambia el día de las fechas.
# ----------------------------------------------------------------------------------------------------
function Confirm-Regional {
    $web = Get-PnPWeb -Includes RegionalSettings, RegionalSettings.TimeZone -ErrorAction Stop
    $zona = [string]$web.RegionalSettings.TimeZone.Description
    $esBogota = ($zona -match 'Bogot') -or ($zona -match '-05:00')
    if ($esBogota) { Write-Existente "zona horaria del sitio: $zona"; return }
    if ($ConfigurarRegional -and -not $script:Simulacion) {
        try {
            $bogota = Get-PnPTimeZoneId -Match 'Bogota' -ErrorAction Stop | Select-Object -First 1
            Set-PnPRegionalSettings -TimeZone $bogota -LocaleId 9226 -ErrorAction Stop
            Write-Creado 'zona horaria (UTC-05:00 Bogotá) y configuración regional es-CO'
            return
        }
        catch { Write-Aviso "No se pudo fijar la zona horaria automáticamente ($($_.Exception.Message))." }
    }
    Write-Aviso "La zona horaria del sitio es '$zona'. Debe ser (UTC-05:00) Bogotá, Lima, Quito (Configuración del sitio > Configuración regional), o las fechas de solo fecha pueden cambiar de día."
}

# ----------------------------------------------------------------------------------------------------
# Verificación final
# ----------------------------------------------------------------------------------------------------
function Test-Aprovisionamiento {
    if ($script:Simulacion) { return $true }
    $problemas = New-Object System.Collections.Generic.List[string]
    $esperado = [ordered]@{
        Servicios         = $CamposServicios + @(@{ N = 'Title' })
        Clientes          = $CamposClientes
        Marcas            = $CamposMarcas
        ConfiguracionApp  = $CamposConfiguracion
        LogSincronizacion = $CamposLog
        ServiciosAdjuntos = $CamposAdjuntos
    }
    foreach ($lista in $esperado.Keys) {
        if (-not (Get-ListaSiExiste $lista)) { $problemas.Add("Falta la lista/biblioteca $lista"); continue }
        foreach ($campo in $esperado[$lista]) {
            if (-not (Get-CampoSiExiste $lista $campo.N)) { $problemas.Add("Falta la columna $lista.$($campo.N)") }
        }
    }
    $servicioId = Get-CampoSiExiste 'Servicios' 'ServicioId'
    if ($servicioId -and -not $servicioId.EnforceUniqueValues) { $problemas.Add('Servicios.ServicioId no exige valores únicos (la idempotencia de la sincronización depende de ello)') }

    if ($problemas.Count -eq 0) { Write-Host '  Verificación: todas las listas y columnas existen.' -ForegroundColor Green; return $true }
    foreach ($p in $problemas) { Write-Host "  [FALLO] $p" -ForegroundColor Red }
    return $false
}

# ----------------------------------------------------------------------------------------------------
# Flujo principal
# ----------------------------------------------------------------------------------------------------
function Invoke-Aprovisionamiento {
    Write-Paso 'Conectando a SharePoint'
    if ($script:Simulacion) { Write-Simulado "modo -WhatIf: no se crea ni se modifica nada en $SiteUrl" }
    Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId -ErrorAction Stop

    Write-Paso 'Zona horaria y configuración regional'
    Confirm-Regional

    # Clientes y Marcas primero: Servicios tiene una columna de búsqueda a Clientes.
    Write-Paso 'Lista Clientes'
    Confirm-Lista 'Clientes' | Out-Null
    if (-not $script:Simulacion) { Rename-Titulo 'Clientes' 'Nombre' }
    Confirm-Campos 'Clientes' $CamposClientes
    if (-not $OmitirDatosIniciales) { Confirm-ItemsPorTitulo 'Clientes' $ClientesIniciales @{ Activo = $true } }

    Write-Paso 'Lista Marcas'
    Confirm-Lista 'Marcas' | Out-Null
    Confirm-Campos 'Marcas' $CamposMarcas
    if (-not $OmitirDatosIniciales) { Confirm-ItemsPorTitulo 'Marcas' $MarcasIniciales @{ Activo = $true } }

    Write-Paso 'Lista Servicios'
    Confirm-Lista 'Servicios' | Out-Null
    if (-not $script:Simulacion) { Rename-Titulo 'Servicios' 'Código' }
    Confirm-Campos 'Servicios' $CamposServicios
    Confirm-Indices 'Servicios' (@($CamposServicios | Where-Object { $_.ContainsKey('Indice') -and $_.Indice } | ForEach-Object { $_.N }) + @('Modified'))
    Set-Versionado -Lista 'Servicios' -Activo $true -Versiones 50 -AdjuntosDeshabilitados $true
    if (-not $OmitirVistas) { Confirm-Vistas }

    Write-Paso 'Lista ConfiguracionApp'
    Confirm-Lista 'ConfiguracionApp' | Out-Null
    if (-not $script:Simulacion) { Rename-Titulo 'ConfiguracionApp' 'Clave' }
    Confirm-Campos 'ConfiguracionApp' $CamposConfiguracion
    Confirm-Configuracion

    Write-Paso 'Lista LogSincronizacion'
    Confirm-Lista 'LogSincronizacion' | Out-Null
    if (-not $script:Simulacion) { Rename-Titulo 'LogSincronizacion' 'CorrelationId' }
    Confirm-Campos 'LogSincronizacion' $CamposLog
    Set-Versionado -Lista 'LogSincronizacion' -Activo $false

    Write-Paso 'Biblioteca ServiciosAdjuntos'
    Confirm-Lista 'ServiciosAdjuntos' 'DocumentLibrary' | Out-Null
    Confirm-Campos 'ServiciosAdjuntos' $CamposAdjuntos
    Confirm-Indices 'ServiciosAdjuntos' (@($CamposAdjuntos | Where-Object { $_.ContainsKey('Indice') -and $_.Indice } | ForEach-Object { $_.N }))
    Set-Versionado -Lista 'ServiciosAdjuntos' -Activo $true -Versiones 50

    if (-not $OmitirPermisos) {
        Write-Paso 'Permisos'
        Confirm-Permisos
    }

    Write-Paso 'Verificación'
    $correcto = Test-Aprovisionamiento

    Write-Host ''
    Write-Host "Resumen: $($script:Creado) creado(s), $($script:Existente) que ya existían, $($script:Advertencias.Count) aviso(s)." -ForegroundColor Cyan
    foreach ($aviso in $script:Advertencias) { Write-Host " - $aviso" -ForegroundColor Yellow }
    Write-Host 'Pendiente manual: conceder Sites.Selected (write) a la app en este sitio (docs/06 §1.7) y revisar los flujos de Power Automate (§3).' -ForegroundColor Cyan
    return $correcto
}

# Al cargarlo con "punto" (. ./scripts/provision-sharepoint.ps1) solo se definen las funciones: así se prueba.
if ($MyInvocation.InvocationName -ne '.') {
    $resultado = Invoke-Aprovisionamiento
    if (-not $resultado) { exit 1 }
}
