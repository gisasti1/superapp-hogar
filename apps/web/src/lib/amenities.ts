/**
 * Catálogo único de amenities (lo que puede tener una propiedad).
 * Se usa en el publicar, en el buscador con filtros y en el detalle.
 * Organizado en 4 grupos para mostrar mejor en UI.
 */

export type Amenity = { id: string; label: string };

export const AMENITY_GROUPS: { title: string; items: Amenity[] }[] = [
  {
    title: 'Adentro de la casa',
    items: [
      { id: 'furnished',     label: '🛋️ Amueblado' },
      { id: 'ac',            label: '❄️ Aire acondicionado' },
      { id: 'heating',       label: '🔥 Calefacción' },
      { id: 'floorHeating',  label: '♨️ Losa radiante' },
      { id: 'fireplace',     label: '🪵 Hogar a leña' },
      { id: 'naturalGas',    label: '🔥 Gas natural' },
      { id: 'internet',      label: '📡 Internet incluido' },
      { id: 'cableTV',       label: '📺 Cable / TV' },
      { id: 'closet',        label: '🚪 Placard / vestidor' },
      { id: 'kitchenIsland', label: '🍳 Cocina con isla' },
      { id: 'dishwasher',    label: '🍽️ Lavavajillas' },
      { id: 'washingMachine',label: '🧺 Lavarropas' },
      { id: 'dryer',         label: '🌬️ Secarropas' },
    ],
  },
  {
    title: 'Espacios y áreas comunes',
    items: [
      { id: 'pool',     label: '🏊 Pileta' },
      { id: 'gym',      label: '🏋️ Gimnasio' },
      { id: 'bbq',      label: '🍖 Parrilla' },
      { id: 'sum',      label: '🥂 SUM / salón de usos múltiples' },
      { id: 'garden',   label: '🌿 Jardín' },
      { id: 'balcony',  label: '🌅 Balcón' },
      { id: 'terrace',  label: '☀️ Terraza' },
      { id: 'patio',    label: '🪴 Patio' },
      { id: 'solarium', label: '🏝️ Solárium' },
      { id: 'sauna',    label: '🧖 Sauna' },
      { id: 'coworking',label: '💻 Coworking' },
      { id: 'kidsArea', label: '🎠 Juegos para niños' },
      { id: 'rooftop',  label: '🏙️ Roof top' },
    ],
  },
  {
    title: 'Seguridad y accesos',
    items: [
      { id: 'doorman',    label: '👔 Portería' },
      { id: 'security24', label: '🛡️ Seguridad 24h' },
      { id: 'alarm',      label: '🚨 Alarma' },
      { id: 'cameras',    label: '📹 Cámaras de seguridad' },
      { id: 'intercom',   label: '📞 Portero eléctrico' },
      { id: 'elevator',   label: '🛗 Ascensor' },
      { id: 'accessible', label: '♿ Accesible (sin escaleras)' },
    ],
  },
  {
    title: 'Servicios y extras',
    items: [
      { id: 'parking',     label: '🚗 Cochera' },
      { id: 'bikeStorage', label: '🚲 Bicicletero' },
      { id: 'storage',     label: '📦 Baulera' },
      { id: 'laundry',     label: '🧼 Lavadero común' },
      { id: 'petFriendly', label: '🐶 Apto mascotas' },
      { id: 'evCharger',   label: '🔌 Cargador eléctrico (auto)' },
      { id: 'solarPanels', label: '☀️ Paneles solares' },
      { id: 'cleaning',    label: '🧹 Servicio de limpieza' },
      { id: 'concierge',   label: '🎩 Concierge' },
    ],
  },
];

/** Mapa plano {id → label} para mostrar amenities guardadas en la propiedad. */
export const AMENITY_LABELS: Record<string, string> = AMENITY_GROUPS.flatMap(g => g.items).reduce(
  (acc, a) => { acc[a.id] = a.label; return acc; },
  {} as Record<string, string>,
);

/** Lista plana para iterar en formularios sin agrupar. */
export const AMENITIES: Amenity[] = AMENITY_GROUPS.flatMap(g => g.items);
