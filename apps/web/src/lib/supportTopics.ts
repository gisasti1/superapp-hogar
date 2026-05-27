/**
 * Catálogo de categorías y sub-temas para tickets de soporte.
 * El usuario elige una categoría → vemos los sub-temas relevantes.
 */

export type SupportTopic = {
  id:    string;          // id de categoría principal (lo que se guarda en DB)
  icon:  string;
  label: string;
  description: string;
  subTopics: { id: string; label: string }[];
};

export const SUPPORT_TOPICS: SupportTopic[] = [
  {
    id:    'ACCOUNT',
    icon:  '👤',
    label: 'Cuenta y perfil',
    description: 'Email, contraseña, datos personales, eliminar cuenta',
    subTopics: [
      { id: 'change-email',     label: 'Quiero cambiar mi email' },
      { id: 'reset-password',   label: 'No puedo recuperar la contraseña' },
      { id: 'delete-account',   label: 'Quiero dar de baja mi cuenta' },
      { id: 'update-data',      label: 'Actualizar mis datos personales' },
      { id: 'identity',         label: 'Problemas con la verificación de identidad' },
      { id: 'other',            label: 'Otro tema de cuenta' },
    ],
  },
  {
    id:    'PAYMENTS',
    icon:  '💳',
    label: 'Pagos',
    description: 'Pagos no acreditados, cobros, recibos',
    subTopics: [
      { id: 'not-credited',     label: 'Pagué y no se acredita' },
      { id: 'wrong-charge',     label: 'Cobro indebido o duplicado' },
      { id: 'mp-issue',         label: 'Problema con Mercado Pago' },
      { id: 'receipt-issue',    label: 'No me llegó el comprobante' },
      { id: 'refund',           label: 'Pedir reembolso' },
      { id: 'autodebit',        label: 'Problemas con débito automático' },
      { id: 'other',            label: 'Otro tema de pagos' },
    ],
  },
  {
    id:    'CONTRACTS',
    icon:  '📄',
    label: 'Contratos',
    description: 'Errores, firma, modificaciones',
    subTopics: [
      { id: 'wrong-data',       label: 'Error en los datos del contrato' },
      { id: 'signature-issue',  label: 'No puedo firmar' },
      { id: 'modify',           label: 'Necesito modificar mi contrato' },
      { id: 'terminate',        label: 'Quiero terminar el contrato anticipadamente' },
      { id: 'cosigner',         label: 'Problemas con co-firmantes' },
      { id: 'template',         label: 'Falta una plantilla / modelo' },
      { id: 'other',            label: 'Otro tema de contratos' },
    ],
  },
  {
    id:    'LISTINGS',
    icon:  '🏘️',
    label: 'Inmuebles',
    description: 'Publicar, despublicar, fake, búsqueda',
    subTopics: [
      { id: 'publish-issue',    label: 'No puedo publicar mi inmueble' },
      { id: 'unpublish',        label: 'Quiero despublicar' },
      { id: 'fake-listing',     label: 'Reportar inmueble falso o engañoso' },
      { id: 'search-issue',     label: 'Problemas con el buscador / filtros' },
      { id: 'photos',           label: 'Problemas para subir fotos' },
      { id: 'visit-issue',      label: 'Problemas con visitas / agenda' },
      { id: 'other',            label: 'Otro tema de inmuebles' },
    ],
  },
  {
    id:    'SERVICES',
    icon:  '🔧',
    label: 'Servicios del hogar',
    description: 'Prestadores, reservas, calidad',
    subTopics: [
      { id: 'noshow',           label: 'El prestador no se presentó' },
      { id: 'bad-quality',      label: 'Mala experiencia con un prestador' },
      { id: 'overcharge',       label: 'Me cobró de más' },
      { id: 'cancel',           label: 'Cancelar una reserva' },
      { id: 'refund-service',   label: 'Pedir reembolso de un servicio' },
      { id: 'report-provider',  label: 'Reportar un prestador' },
      { id: 'other',            label: 'Otro tema de servicios' },
    ],
  },
  {
    id:    'TECHNICAL',
    icon:  '🐛',
    label: 'Técnico',
    description: 'Bugs, errores, app no carga',
    subTopics: [
      { id: 'bug',              label: 'Encontré un error / bug' },
      { id: 'slow',             label: 'La app va lenta' },
      { id: 'not-loading',      label: 'No me carga una pantalla' },
      { id: 'mobile',           label: 'Problema en mobile / responsive' },
      { id: 'notifications',    label: 'No me llegan las notificaciones' },
      { id: 'other',            label: 'Otro problema técnico' },
    ],
  },
  {
    id:    'SUGGESTION',
    icon:  '💡',
    label: 'Sugerencia',
    description: 'Nuevas funciones, mejoras, ideas',
    subTopics: [
      { id: 'new-feature',      label: 'Sugiero una nueva funcionalidad' },
      { id: 'improvement',      label: 'Algo se puede mejorar' },
      { id: 'category',         label: 'Falta una categoría / amenity' },
      { id: 'language',         label: 'Traducción / idioma' },
      { id: 'other',            label: 'Otra sugerencia' },
    ],
  },
  {
    id:    'OTHER',
    icon:  '✉️',
    label: 'Otro',
    description: 'No encuentro mi tema en las opciones',
    subTopics: [
      { id: 'general',          label: 'Consulta general' },
      { id: 'business',         label: 'Quiero proponer una alianza / negocio' },
      { id: 'press',            label: 'Consulta de prensa / media' },
      { id: 'legal',            label: 'Consulta legal' },
      { id: 'other',            label: 'Otro' },
    ],
  },
];

export const SUPPORT_TOPIC_BY_ID: Record<string, SupportTopic> = SUPPORT_TOPICS.reduce(
  (acc, t) => { acc[t.id] = t; return acc; },
  {} as Record<string, SupportTopic>,
);

export const SUPPORT_SUBTOPIC_LABEL: Record<string, string> = SUPPORT_TOPICS.flatMap(
  t => t.subTopics.map(s => [`${t.id}:${s.id}`, s.label] as [string, string]),
).reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {} as Record<string, string>);

export const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  OPEN:         { label: 'Abierto',          color: 'bg-habitta-beige/60 text-habitta-deep' },
  IN_PROGRESS:  { label: 'En curso',         color: 'bg-habitta-eucalyptus/30 text-habitta-eucalyptus' },
  WAITING_USER: { label: 'Esperando tu respuesta', color: 'bg-amber-100 text-amber-700' },
  RESOLVED:     { label: '✓ Resuelto',       color: 'bg-emerald-100 text-emerald-700' },
  CLOSED:       { label: 'Cerrado',          color: 'bg-habitta-stone/20 text-habitta-charcoal' },
};

export const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  LOW:    { label: 'Baja',    color: 'text-habitta-stone' },
  NORMAL: { label: 'Normal',  color: 'text-habitta-deep' },
  HIGH:   { label: 'Alta',    color: 'text-habitta-terra' },
  URGENT: { label: 'Urgente', color: 'text-red-600' },
};
