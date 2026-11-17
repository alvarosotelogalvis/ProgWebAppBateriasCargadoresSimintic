// Esquema de SharePoint de la PWA (docs/03-Modelo-de-Datos.md y docs/06 §2.3).
// Fuente de verdad del aprovisionador por Graph. Los nombres internos (n) deben coincidir con los de
// src/infrastructure/graph/mappers/servicioMapper.ts: una prueba (provisionSharepointGraph.test.ts) lo comprueba.
//
// Tipos (t): texto | nota | eleccion | fecha (solo fecha) | fechaHora | numero | moneda | si_no | busqueda
// Banderas: obligatorio, unico (implica índice), indice, max (largo del texto), defecto, opciones.

export const ESTADOS_SERVICIO = [
  'Recibido',
  'Diagnosticado',
  'Cotizado',
  'En reparación',
  'Entregado',
  'Facturado',
  'Disposición final',
  'Anulado',
];

export const CAMPOS = {
  Clientes: [
    { n: 'NIT', d: 'NIT', t: 'texto' },
    { n: 'Activo', d: 'Activo', t: 'si_no', defecto: true },
    { n: 'CorreoContacto', d: 'Correo de contacto', t: 'texto' },
  ],
  Marcas: [{ n: 'Activo', d: 'Activo', t: 'si_no', defecto: true }],
  Servicios: [
    { n: 'ServicioId', d: 'ServicioId', t: 'texto', max: 40, obligatorio: true, unico: true },
    { n: 'Estado', d: 'Estado', t: 'eleccion', opciones: ESTADOS_SERVICIO, indice: true },
    { n: 'TipoEquipo', d: 'Tipo de equipo', t: 'eleccion', opciones: ['Batería', 'Cargador'] },
    { n: 'FechaRecepcion', d: 'Fecha de recepción', t: 'fecha' },
    { n: 'Cliente', d: 'Cliente', t: 'busqueda', lista: 'Clientes', campo: 'Title' },
    { n: 'NumeroSolicitud', d: 'Número de solicitud', t: 'numero', indice: true, unico: true },
    { n: 'Marca', d: 'Marca', t: 'texto', max: 60 },
    { n: 'Referencia', d: 'Referencia', t: 'texto', max: 50 },
    { n: 'SerieEquipo', d: 'Serie del equipo', t: 'texto', max: 50, indice: true },
    {
      n: 'Diagnostico',
      d: 'Diagnóstico',
      t: 'eleccion',
      opciones: ['Reparable', 'Garantía', 'Sin falla', 'D. FINAL'],
    },
    { n: 'ObservacionTecnica', d: 'Observación técnica', t: 'nota' },
    { n: 'FechaSocializacionDF', d: 'Fecha de socialización DF', t: 'fecha' },
    { n: 'CotizacionFechaEnvio', d: 'Cotización: fecha de envío', t: 'fecha' },
    { n: 'CotizacionValor', d: 'Cotización: valor', t: 'moneda' },
    {
      n: 'CotizacionEstado',
      d: 'Cotización: estado',
      t: 'eleccion',
      opciones: ['Pendiente', 'Aprobada', 'Rechazada'],
    },
    { n: 'OTDetalle', d: 'OT: detalle', t: 'nota' },
    { n: 'OTCostoReparacion', d: 'OT: costo de reparación', t: 'moneda' },
    { n: 'OTCorreoEnviado', d: 'OT: correo enviado', t: 'si_no', defecto: false },
    { n: 'FechaEntrega', d: 'Fecha de entrega', t: 'fecha' },
    { n: 'ProyeccionVidaUtil', d: 'Proyección de vida útil', t: 'fecha', indice: true },
    {
      n: 'AlertaVidaUtilNivel',
      d: 'Alerta de vida útil',
      t: 'eleccion',
      opciones: ['Ninguna', '90', '60', '30', 'Vencida'],
      defecto: 'Ninguna',
    },
    { n: 'FacturaNumero', d: 'Factura: número', t: 'texto', max: 30 },
    { n: 'FacturaFecha', d: 'Factura: fecha', t: 'fecha' },
    { n: 'CapturadoPor', d: 'Capturado por', t: 'texto' },
    { n: 'CapturadoPorNombre', d: 'Capturado por (nombre)', t: 'texto' },
    { n: 'CapturadoEn', d: 'Capturado en', t: 'fechaHora' },
    { n: 'ActualizadoEnDispositivo', d: 'Actualizado en dispositivo', t: 'fechaHora' },
    { n: 'DispositivoId', d: 'Dispositivo', t: 'texto' },
    { n: 'AppVersion', d: 'Versión de la app', t: 'texto' },
    { n: 'UrlCarpetaAdjuntos', d: 'URL de la carpeta de adjuntos', t: 'nota' },
    { n: 'MotivoAnulacion', d: 'Motivo de anulación', t: 'nota' },
    { n: 'FechaAnulacion', d: 'Fecha de anulación', t: 'fecha' },
  ],
  ConfiguracionApp: [
    { n: 'Valor', d: 'Valor', t: 'nota' },
    { n: 'Descripcion', d: 'Descripción', t: 'nota' },
  ],
  LogSincronizacion: [
    { n: 'Usuario', d: 'Usuario', t: 'texto' },
    { n: 'Dispositivo', d: 'Dispositivo', t: 'texto' },
    { n: 'AppVersion', d: 'Versión de la app', t: 'texto' },
    { n: 'Inicio', d: 'Inicio', t: 'fechaHora' },
    { n: 'Fin', d: 'Fin', t: 'fechaHora' },
    { n: 'Resultado', d: 'Resultado', t: 'eleccion', opciones: ['OK', 'Parcial', 'Error'] },
    { n: 'ServiciosSubidos', d: 'Servicios subidos', t: 'numero' },
    { n: 'ArchivosSubidos', d: 'Archivos subidos', t: 'numero' },
    { n: 'ServiciosDescargados', d: 'Servicios descargados', t: 'numero' },
    { n: 'Conflictos', d: 'Conflictos', t: 'numero' },
    { n: 'Errores', d: 'Errores', t: 'nota' },
  ],
  ServiciosAdjuntos: [
    { n: 'ServicioId', d: 'ServicioId', t: 'texto', max: 40, indice: true },
    { n: 'AdjuntoId', d: 'AdjuntoId', t: 'texto', max: 40, indice: true },
    {
      n: 'TipoAdjunto',
      d: 'Tipo de adjunto',
      t: 'eleccion',
      opciones: [
        'Foto ingreso',
        'Foto salida',
        'Formato diagnóstico',
        'Cotización',
        'Factura',
        'Disposición final',
      ],
    },
    { n: 'FechaCaptura', d: 'Fecha de captura', t: 'fechaHora' },
    { n: 'CapturadoPor', d: 'Capturado por', t: 'texto' },
  ],
};

/** Orden de creación: Clientes antes que Servicios (Servicios tiene una búsqueda a Clientes). */
export const LISTAS = [
  { nombre: 'Clientes', plantilla: 'genericList' },
  { nombre: 'Marcas', plantilla: 'genericList' },
  { nombre: 'Servicios', plantilla: 'genericList' },
  { nombre: 'ConfiguracionApp', plantilla: 'genericList' },
  { nombre: 'LogSincronizacion', plantilla: 'genericList' },
  { nombre: 'ServiciosAdjuntos', plantilla: 'documentLibrary' },
];

export const CLIENTES_INICIALES = ['NAVAR ASOCIADOS', 'ARIS MINING SEGOVIA', 'ARIS MINING MARMATO'];
export const MARCAS_INICIALES = ['ROQUET'];

/** Claves de ConfiguracionApp y su valor por defecto (docs/03 §6.3; deben coincidir con src/domain/config.ts). */
export const CONFIGURACION_POR_DEFECTO = {
  VersionMinimaApp: ['1.0.0', 'Bloquea la sincronización en versiones menores.'],
  SyncModoAutenticacion: [
    'confirmar',
    'confirmar | reautenticar. reautenticar = login interactivo en cada sincronización.',
  ],
  SyncReautenticacionHoras: [
    '12',
    'Horas máximas desde el último login interactivo en modo confirmar.',
  ],
  MinFotosIngreso: ['1', 'Mínimo de fotos de ingreso.'],
  MaxFotosIngreso: ['5', 'Máximo de fotos de ingreso.'],
  MinFotosSalida: ['1', 'Mínimo de fotos de salida.'],
  MaxFotosSalida: ['10', 'Máximo de fotos de salida.'],
  MaxTamanoPdfMB: ['20', 'Tamaño máximo de un PDF, en MB.'],
  ImagenMaxLadoPx: ['1920', 'Lado mayor máximo de la foto optimizada, en píxeles.'],
  ImagenCalidad: ['0.75', 'Calidad JPEG de la foto optimizada (0 a 1).'],
  VidaUtilMesesDefecto: ['12', 'Meses sugeridos para la proyección de vida útil.'],
  UmbralesAlertaDias: [
    '90,60,30',
    'Umbrales de alerta de vida útil, en días (CSV). Los usan la app y el flujo.',
  ],
  RetencionCerradosMeses: ['3', 'Meses que se conservan localmente los servicios cerrados.'],
  RetencionOriginalesDias: ['7', 'Días que se conserva el archivo original ya sincronizado.'],
  DescargarMiniaturasRemotas: ['true', 'true | false. Solo para servicios abiertos.'],
  DiagnosticoValorDisposicionFinal: [
    'D. FINAL',
    'Valor de Diagnostico que significa disposición final.',
  ],
  RecordatorioPendientesHoras: ['24', 'Horas tras las que se avisa de pendientes antiguos.'],
};
