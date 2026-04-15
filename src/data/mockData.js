export const MOCK_ACCIONISTA = {
  dpi: '2456789012345', codigo: 'ACC-005821',
  nombre: 'MENDOZA ARRIAGA CARLOS ROBERTO', iniciales: 'CM',
  foto: 'https://randomuser.me/api/portraits/men/66.jpg',
  estatus: 21, descripEstatus: 'Alta Actualizado',
  acciones_comunes: 1250, acciones_preferentes_a: 300,
  dividendos: 12480.50, ultima_actualizacion: '14/4/2026',
  fecha_actu_iso: '2026-04-14',
  fecha_nacimiento: '07/08/2000', genero: 'F', estado_civil: 'S',
  vencimiento_dpi: '31/05/2029', correlativo: 2,
  email: 'cmendoza@correo.com', nit: '9834521-3',
  tel_casa: '22345678', tel_celular: '56789012', tel_trabajo: '23456789',
  direccion: 'Colonia Vista Hermosa II, Zona 15', zona: '15',
  pais: 'GTM', cod_depto: '01', cod_municipio: '101',
  actividad_economica: 'K6499', profesion: 'ING',
  nivel_estudios: 'UNI', lugar_trabajo: 'Edificio Torre Norte',
  patrono_nombre: 'BANTRAB S.A.',
  proveedor_bantrab: 'N', empleado_bantrab: 'N', pariente_id: 'N',
};

export const MOCK_ASAMBLEAS = [
  {
    id: 1, num: 'ASM-2025-01', tipo: 'O', descripcion: 'ORDINARIA',
    ordinal: 'Vigésima Primera', fecha: '28/03/2025', estado: 'S',
    fecha_entrega_desde: '2025-03-01', fecha_entrega_hasta: '2025-03-31',
    fecha_cred_desde: '2025-03-01', fecha_cred_hasta: '2025-03-31'
  },
  {
    id: 2, num: 'ASM-2025-02', tipo: 'E', descripcion: 'EXTRAORDINARIA',
    ordinal: 'Quinta Extraordinaria', fecha: '15/04/2025', estado: 'S',
    fecha_entrega_desde: '2025-04-01', fecha_entrega_hasta: '2025-04-30',
    fecha_cred_desde: '2025-04-01', fecha_cred_hasta: '2025-04-30'
  },
];

export const MOCK_EXPEDIENTE_0080 = {
  asamblea: 'ASM-2025-01', tipo_asamblea: 'O',
  expediente: 12345, credencial: 12345,
  accionista: 'ACC-005821', nombre: 'MENDOZA ARRIAGA CARLOS ROBERTO',
  estado_expediente: 2,
  tipo_docemitido: 1, d_tipo_documento: 'Acciones Comunes',
  votos_propios: 1250, votos_ajenos: 0, total_votos: 1250,
  votos_consignados: 1250, votos_nulos: 0,
  ejercio_voto: 'S', desde_carta: 0, hasta_carta: 0,
  check_fec_entregado: 'S', fecha_entrega: '2025-03-15',
  check_fec_recibido: 'S', fecha_recibido: '2025-03-15',
  check_credencial: 'N', fecha_credencial: null,
  estado_impresion: 'N', estado_reimpresion: 'N',
  autoriza_antecedentes: 'S',
};

export const MOCK_INVERSIONES = [
  { tipo_doc: 1, descripcion: 'Acciones Comunes Clase A', cantidad: 1250 },
  { tipo_doc: 2, descripcion: 'Acciones Preferentes Serie A', cantidad: 300 },
];

export const MOCK_TITULOS = [
  { num: 'TIT-2024-00821', estado: 'Pendiente Entrega', emision: '10/12/2024', tipo: 'Común' },
  { num: 'TIT-2025-00105', estado: 'Pendiente Entrega', emision: '15/01/2025', tipo: 'Preferente' },
];

export const MOCK_DETALLE_EXPEDIENTE = [
  {
    correlativo: 1, nombre_persona: 'GARCIA FUENTES MARIO ANTONIO', numero_dpi: '1234567890123',
    orden_cedula: '01', registro_cedula: 123456, d_deptoexten: 'Guatemala', d_muniexten: 'Guatemala'
  },
  {
    correlativo: 2, nombre_persona: 'LOPEZ MORALES ANA MARIA', numero_dpi: '9876543210987',
    orden_cedula: '02', registro_cedula: 654321, d_deptoexten: 'Guatemala', d_muniexten: 'Mixco'
  },
];

export const MOCK_MOTIVOS_RECHAZO = [
  { codigo: 'DOC01', descripcion: 'Documentación incompleta' },
  { codigo: 'DOC02', descripcion: 'Documentación vencida o ilegible' },
  { codigo: 'VIG01', descripcion: 'Datos desactualizados del accionista' },
  { codigo: 'DUP01', descripcion: 'Posible duplicidad de expediente' },
];

export const MOCK_ESTADOS = [
  { codigo: '1', descripcion: 'Entregado' },
  { codigo: '2', descripcion: 'Recibido' },
  { codigo: '4', descripcion: 'Aprobado' },
  { codigo: '5', descripcion: 'En Revisión' },
  { codigo: '6', descripcion: 'Credencial a Emitir' },
  { codigo: '8', descripcion: 'Credencial Entregada' },
  { codigo: '10', descripcion: 'Denegado' },
];

export const MOCK_PAISES = [{ codigo: 'GTM', nombre: 'Guatemala' }, { codigo: 'HND', nombre: 'Honduras' }, { codigo: 'MEX', nombre: 'México' }];
export const MOCK_DEPTOS = [{ codigo: '01', nombre: 'Guatemala', pais: 'GTM' }, { codigo: '02', nombre: 'Sacatepéquez', pais: 'GTM' }];
export const MOCK_MUNICIPIOS = [{ codigo: '101', nombre: 'Guatemala', depto: '01' }, { codigo: '102', nombre: 'Mixco', depto: '01' }];
export const MOCK_ACTIVIDADES = [{ codigo: 'K6499', descripcion: 'K6499 – Actividades Financieras' }, { codigo: 'G4711', descripcion: 'G4711 – Comercio al por menor' }];
export const MOCK_PROFESIONES = [{ codigo: 'ING', descripcion: 'Ingeniero/a' }, { codigo: 'ABG', descripcion: 'Abogado/a' }, { codigo: 'MED', descripcion: 'Médico/a' }];
export const MOCK_NIVELES = [{ codigo: 'UNI', descripcion: 'Universitario' }, { codigo: 'DIV', descripcion: 'Diversificado' }, { codigo: 'POS', descripcion: 'Postgrado' }];

// ── Limitación Funcional ─────────────────────────────────────
export const MOCK_LIMITACIONES_FUNCIONALES = [
  { codigo: 'AUD', descripcion: 'Auditiva', activo: true },
  { codigo: 'VIS', descripcion: 'Visual', activo: true },
  { codigo: 'MOV', descripcion: 'Movilidad', activo: true },
  { codigo: 'HAB', descripcion: 'Habla', activo: true },
];

// Limitación funcional registrada para un accionista (puede ser null)
export const MOCK_LIMITACION_ACCIONISTA = {
  codigo: 'ACC-005821',
  limitaciones: ['MOV', 'VIS', 'AUD'],  // múltiples limitaciones mockeadas
  observaciones: 'El accionista requiere asistencia para movilidad y cuenta con limitaciones visuales.',
  fecha_registro: '10/04/2026',
  usuario_registro: 'JLOPEZ',
};

// Acompañante registrado para un accionista (puede ser null)
export const MOCK_ACOMPANANTE = null;

// Accionista de prueba que SÍ está acreditado (para buscar como acompañante)
export const MOCK_ACOMPANANTE_VALIDO = {
  dpi: '1234567890101',
  codigo: 'ACC-003102',
  nombre: 'GARCIA FUENTES MARIO ANTONIO',
  expediente: 12300,
  acreditado: true,
};
