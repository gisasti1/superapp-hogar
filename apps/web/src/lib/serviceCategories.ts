/**
 * Catálogo único de categorías de prestadores de servicios del hogar.
 * Lo usan: marketplace /services, registro de provider, bookings.
 *
 * Si un prestador no encaja en ninguna, elige OTHER y describe su
 * servicio en el campo "description" del perfil.
 */

export type ServiceCategory = { id: string; label: string };

export const SERVICE_CATEGORY_GROUPS: { title: string; items: ServiceCategory[] }[] = [
  {
    title: 'Instalaciones y arreglos',
    items: [
      { id: 'PLUMBER',          label: '🚰 Plomero' },
      { id: 'ELECTRICIAN',      label: '⚡ Electricista' },
      { id: 'GAS',              label: '🔥 Gasista matriculado' },
      { id: 'AC_TECHNICIAN',    label: '❄️ Aire acondicionado' },
      { id: 'APPLIANCE_REPAIR', label: '🔌 Reparación de electrodomésticos' },
      { id: 'HANDYMAN',         label: '🛠 Manitas / multifunción' },
      { id: 'GENERAL',          label: '🧰 Servicios generales' },
    ],
  },
  {
    title: 'Construcción y reformas',
    items: [
      { id: 'PAINTER',     label: '🎨 Pintor' },
      { id: 'CARPENTER',   label: '🪚 Carpintero' },
      { id: 'MASON',       label: '🧱 Albañil' },
      { id: 'TILER',       label: '🪨 Colocador de pisos / azulejos' },
      { id: 'PLASTERER',   label: '🪜 Yesero / durlock' },
      { id: 'ROOFER',      label: '🏠 Techista / impermeabilizaciones' },
      { id: 'WELDER',      label: '⚒️ Herrero / soldador' },
      { id: 'GLAZIER',     label: '🪟 Vidriero' },
      { id: 'LOCKSMITH',   label: '🔑 Cerrajero' },
    ],
  },
  {
    title: 'Limpieza y mantenimiento',
    items: [
      { id: 'CLEANER',     label: '🧹 Limpieza' },
      { id: 'GARDENER',    label: '🌿 Jardinería' },
      { id: 'POOL_TECH',   label: '🏊 Mantenimiento de piletas' },
      { id: 'PEST_CONTROL',label: '🪳 Control de plagas' },
      { id: 'CHIMNEY',     label: '🪵 Limpieza de chimeneas' },
    ],
  },
  {
    title: 'Mudanzas y traslados',
    items: [
      { id: 'MOVER',          label: '📦 Mudanzas' },
      { id: 'DRIVER',         label: '🚚 Fletes / cargas chicas' },
      { id: 'ASSEMBLY',       label: '🪛 Armado de muebles' },
    ],
  },
  {
    title: 'Seguridad y conectividad',
    items: [
      { id: 'SECURITY_INSTALL', label: '🚨 Alarmas y cámaras' },
      { id: 'INTERNET_TECH',    label: '📡 Internet / WiFi / redes' },
      { id: 'TV_TECH',          label: '📺 TV / antena' },
      { id: 'SMART_HOME',       label: '💡 Domótica' },
    ],
  },
  {
    title: 'Diseño y profesionales',
    items: [
      { id: 'ARCHITECT',         label: '📐 Arquitecto' },
      { id: 'INTERIOR_DESIGNER', label: '🛋️ Diseñador de interiores' },
      { id: 'DECORATOR',         label: '🖼️ Decorador' },
      { id: 'PHOTOGRAPHER',      label: '📷 Fotógrafo de inmuebles' },
      { id: 'ENGINEER',          label: '📊 Ingeniero' },
    ],
  },
  {
    title: 'Otros',
    items: [
      { id: 'OTHER',             label: '✨ Otro (describilo)' },
    ],
  },
];

/** Lista plana para iterar / filtrar. */
export const SERVICE_CATEGORIES: ServiceCategory[] = SERVICE_CATEGORY_GROUPS.flatMap(g => g.items);

/** Mapa plano {id → label} para mostrar la categoría guardada. */
export const SERVICE_CATEGORY_LABELS: Record<string, string> = SERVICE_CATEGORIES.reduce(
  (acc, c) => { acc[c.id] = c.label; return acc; },
  {} as Record<string, string>,
);

/** El frontend identifica OTHER para pedirle al prestador que describa qué hace. */
export const OTHER_CATEGORY = 'OTHER';
