/**
 * Catálogo único de categorías de prestadores de servicios del hogar.
 * Lo usan: marketplace /services, registro de provider, bookings.
 *
 * Si un prestador no encaja en ninguna, elige OTHER y describe su
 * servicio en el campo "description" del perfil.
 */

export type ServiceCategory = { id: string; label: string };
export type ServiceGroup = {
  id:          string;
  title:       string;
  icon:        string;
  description: string;
  color:       string;   // tailwind bg + border accent
  items:       ServiceCategory[];
};

export const SERVICE_CATEGORY_GROUPS: ServiceGroup[] = [
  {
    id: 'fix',
    title: 'Instalaciones y arreglos',
    icon: '🔧',
    description: 'Plomería, gas, luz, aires, electrodomésticos.',
    color: 'from-rose-50 to-orange-50 border-rose-200',
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
    id: 'build',
    title: 'Construcción y reformas',
    icon: '🏗️',
    description: 'Pintura, carpintería, albañilería, techos.',
    color: 'from-amber-50 to-yellow-50 border-amber-200',
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
    id: 'clean',
    title: 'Limpieza y mantenimiento',
    icon: '🧹',
    description: 'Casa, jardín, piletas, plagas.',
    color: 'from-emerald-50 to-teal-50 border-emerald-200',
    items: [
      { id: 'CLEANER',     label: '🧹 Limpieza' },
      { id: 'GARDENER',    label: '🌿 Jardinería' },
      { id: 'POOL_TECH',   label: '🏊 Mantenimiento de piletas' },
      { id: 'PEST_CONTROL',label: '🪳 Control de plagas' },
      { id: 'CHIMNEY',     label: '🪵 Limpieza de chimeneas' },
    ],
  },
  {
    id: 'move',
    title: 'Mudanzas y traslados',
    icon: '📦',
    description: 'Mudanzas, fletes, armado de muebles.',
    color: 'from-blue-50 to-sky-50 border-blue-200',
    items: [
      { id: 'MOVER',    label: '📦 Mudanzas' },
      { id: 'DRIVER',   label: '🚚 Fletes / cargas chicas' },
      { id: 'ASSEMBLY', label: '🪛 Armado de muebles' },
    ],
  },
  {
    id: 'tech',
    title: 'Seguridad y conectividad',
    icon: '📡',
    description: 'Alarmas, cámaras, internet, TV, domótica.',
    color: 'from-indigo-50 to-violet-50 border-indigo-200',
    items: [
      { id: 'SECURITY_INSTALL', label: '🚨 Alarmas y cámaras' },
      { id: 'INTERNET_TECH',    label: '📡 Internet / WiFi / redes' },
      { id: 'TV_TECH',          label: '📺 TV / antena' },
      { id: 'SMART_HOME',       label: '💡 Domótica' },
    ],
  },
  {
    id: 'design',
    title: 'Diseño y profesionales',
    icon: '📐',
    description: 'Arquitectos, diseñadores, fotógrafos.',
    color: 'from-purple-50 to-fuchsia-50 border-purple-200',
    items: [
      { id: 'ARCHITECT',         label: '📐 Arquitecto' },
      { id: 'INTERIOR_DESIGNER', label: '🛋️ Diseñador de interiores' },
      { id: 'DECORATOR',         label: '🖼️ Decorador' },
      { id: 'PHOTOGRAPHER',      label: '📷 Fotógrafo de inmuebles' },
      { id: 'ENGINEER',          label: '📊 Ingeniero' },
    ],
  },
  {
    id: 'other',
    title: 'Otros',
    icon: '✨',
    description: '¿No encontrás lo tuyo? Describilo.',
    color: 'from-gray-50 to-slate-50 border-gray-200',
    items: [
      { id: 'OTHER', label: '✨ Otro (describilo)' },
    ],
  },
];

// Lookup rápido para saber a qué grupo pertenece una categoría
export const CATEGORY_TO_GROUP: Record<string, string> = SERVICE_CATEGORY_GROUPS.flatMap(
  g => g.items.map(it => [it.id, g.id] as [string, string]),
).reduce((acc, [cat, grp]) => { acc[cat] = grp; return acc; }, {} as Record<string, string>);

export const GROUP_BY_ID: Record<string, ServiceGroup> = SERVICE_CATEGORY_GROUPS.reduce(
  (acc, g) => { acc[g.id] = g; return acc; }, {} as Record<string, ServiceGroup>,
);

/** Lista plana para iterar / filtrar. */
export const SERVICE_CATEGORIES: ServiceCategory[] = SERVICE_CATEGORY_GROUPS.flatMap(g => g.items);

/** Mapa plano {id → label} para mostrar la categoría guardada. */
export const SERVICE_CATEGORY_LABELS: Record<string, string> = SERVICE_CATEGORIES.reduce(
  (acc, c) => { acc[c.id] = c.label; return acc; },
  {} as Record<string, string>,
);

/** El frontend identifica OTHER para pedirle al prestador que describa qué hace. */
export const OTHER_CATEGORY = 'OTHER';
