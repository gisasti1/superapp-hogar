// Generador del TP2 Habitta para UCEMA MADE 2026
// node build.js → genera TP2-Habitta-FernandoIsasti.docx
const fs = require('fs');
const path = require('path');
process.env.NODE_PATH = '/Users/fernandoisasti/.nvm/versions/node/v20.20.2/lib/node_modules';
require('module').Module._initPaths();

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageOrientation, PageBreak,
} = require('docx');

/* ─── Paleta Habitta ──────────────────────────────────────── */
const COL = {
  deep:      '4B3F35',   // Marrón Profundo (texto / headings)
  earth:     '8C6B4E',
  terra:     'C98E5B',   // Terracota — acento principal
  eucalyptus:'7E9081',   // verde eucalipto — accent
  sand:      'EDE6D9',   // arena — fondo cards
  cream:     'F7F3EE',
  stone:     'B5ADA1',
  beige:     'E2C9A6',
};

const border = (color = 'CCCCCC') => ({ style: BorderStyle.SINGLE, size: 6, color });
const borderBox = (color = 'CCCCCC') => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });

/* ─── Helpers ─────────────────────────────────────────────── */
const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 100 },
  ...opts,
  children: typeof text === 'string'
    ? [new TextRun({ text, font: 'Calibri', size: 22, ...(opts.run || {}) })]
    : text,
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 320, after: 160 },
  children: [new TextRun({ text, bold: true, size: 32, color: COL.deep, font: 'Calibri' })],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 100 },
  children: [new TextRun({ text, bold: true, size: 26, color: COL.terra, font: 'Calibri' })],
});

const bullet = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: 60 },
  children: parseInline(text),
});

const numbered = (text, ref = 'numbers') => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 80 },
  children: parseInline(text),
});

// Parser sencillo de **bold** dentro de un string → TextRun[]
function parseInline(text) {
  if (typeof text !== 'string') return text;
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.filter(Boolean).map(p => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return new TextRun({ text: p.slice(2, -2), bold: true, font: 'Calibri', size: 22 });
    }
    return new TextRun({ text: p, font: 'Calibri', size: 22 });
  });
}

/* ─── Cell helper (con padding interno) ───────────────────── */
const cell = ({ text, width, bg, bold = false, color = COL.deep, align = AlignmentType.LEFT }) => new TableCell({
  borders: borderBox('B5ADA1'),
  width: { size: width, type: WidthType.DXA },
  shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
  margins: { top: 100, bottom: 100, left: 140, right: 140 },
  children: [new Paragraph({
    alignment: align,
    children: typeof text === 'string'
      ? [new TextRun({ text, bold, color, font: 'Calibri', size: 20 })]
      : text,
  })],
});

/* ─── Tabla 2 columnas estilo "Campo | Respuesta" ─────────── */
const PAGE_WIDTH = 11906;
const MARGIN = 1080; // 0.75"
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;     // 9746
const COL_FIELD = Math.round(CONTENT_WIDTH * 0.30);
const COL_VAL   = CONTENT_WIDTH - COL_FIELD;

function plantillaRow(field, value) {
  return new TableRow({
    children: [
      cell({ text: field, width: COL_FIELD, bg: COL.sand, bold: true, color: COL.deep }),
      cell({ text: value, width: COL_VAL }),
    ],
  });
}

/* ─── Tablas custom (más columnas) ────────────────────────── */
function buildComparisonTable(headers, rows) {
  const cols = headers.length;
  const colWidth = Math.floor(CONTENT_WIDTH / cols);
  const widths = Array(cols).fill(colWidth);
  widths[widths.length - 1] = CONTENT_WIDTH - colWidth * (cols - 1); // ajuste

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell({
          text: h, width: widths[i], bg: COL.deep, bold: true, color: 'FFFFFF',
        })),
      }),
      ...rows.map(r => new TableRow({
        children: r.map((v, i) => cell({ text: v, width: widths[i] })),
      })),
    ],
  });
}

/* ════════════════════════════════════════════════════════════
   CONTENIDO
   ════════════════════════════════════════════════════════════ */

const sections = [];

/* ─── Portada / header ─── */
sections.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({
      text: 'Habitta', bold: true, size: 56, color: COL.terra, font: 'Calibri',
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({
      text: 'Donde tu hogar, encuentra todo.',
      italics: true, size: 22, color: COL.eucalyptus, font: 'Calibri',
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COL.terra, space: 4 } },
    children: [new TextRun({
      text: 'Trabajo Práctico 2 — Modelo de negocio y propuesta de valor',
      bold: true, size: 28, color: COL.deep, font: 'Calibri',
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 40 },
    children: [new TextRun({
      text: 'MADE UCEMA 2026 · Ideación y Gestión de Startups · Prof. Mg. Sergio O. Nardini',
      size: 20, color: COL.stone, font: 'Calibri',
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
    children: [
      new TextRun({ text: 'Alumno: ', size: 20, color: COL.stone, font: 'Calibri' }),
      new TextRun({ text: 'Fernando Isasti', bold: true, size: 20, color: COL.deep, font: 'Calibri' }),
      new TextRun({ text: '  ·  Modalidad: Individual', size: 20, color: COL.stone, font: 'Calibri' }),
    ],
  }),
);

/* ─── 1. Problema u oportunidad ─── */
sections.push(H1('1. Problema u oportunidad'));
sections.push(P('El mercado del alquiler residencial en Argentina está fragmentado, opaco y burocrático. Hoy la operación real circula por canales informales mientras los sistemas oficiales acumulan fricción:'));
sections.push(bullet('El **inquilino** busca en MercadoLibre / ZonaProp, conversa por WhatsApp, firma contratos PDF, paga el alquiler por transferencia, contrata gasista por Facebook y resuelve conflictos llamando al propietario.'));
sections.push(bullet('El **propietario** gestiona un Excel con vencimientos, pierde el rastro de pagos, no tiene comprobantes legibles y depende del corredor inmobiliario para casi todo.'));
sections.push(bullet('La **inmobiliaria chica/mediana** trabaja con sistemas pesados (Tokko y similares) mientras la operación real se mueve por canales informales.'));
sections.push(P('La Ley 27.551 + DNU 70/2023 cambiaron las reglas del juego varias veces en 4 años: nadie sabe bien qué cláusulas son válidas, el 12 % de los juicios civiles se originan en alquileres y el inquilino siente que no tiene herramientas para protegerse.'));
sections.push(P('Oportunidad: consolidar en una sola plataforma todo el ciclo de alquiler (búsqueda → visita → contrato → pagos → mantenimiento → fin de contrato) con foco en transparencia y trazabilidad legal.', { run: { italics: true, color: COL.earth } }));

/* ─── 2. Plantilla completa ─── */
sections.push(H1('2. Plantilla completa'));
sections.push(new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [COL_FIELD, COL_VAL],
  rows: [
    plantillaRow('Proyecto / problema',
      'Habitta — plataforma all-in-one para el ciclo completo de alquiler residencial en Argentina (búsqueda, contrato, pagos, comprobantes, servicios del hogar, mediación, soporte).'),
    plantillaRow('Cliente objetivo',
      'Inquilinos urbanos 25-45 (CABA y GBA inicialmente) digitalizados + propietarios particulares con 1-3 inmuebles que no quieren depender 100 % de una inmobiliaria. Segmento secundario: inmobiliarias chicas/medianas (1-10 propiedades en gestión) y prestadores de servicios del hogar verificados.'),
    plantillaRow('Usuario / Comprador / Decisor / Pagador',
      'Inquilino: usuario + comprador + decisor + pagador. Propietario: usuario + comprador + decisor + pagador. Particular (5to tipo): alquila o es dueño por fuera de la app y paga sólo por servicios y comprobantes. En el segmento B2B, la inmobiliaria es el comprador y sus clientes son los usuarios.'),
    plantillaRow('Early adopter / primer fan',
      'Inquilino joven profesional que está por mudarse, ya usa Mercado Pago, WhatsApp Business y Tiendanube, valora "todo en un lugar" y no soporta más el Excel del propietario. Propietario "manija digital" con 1-2 deptos, gestiona él mismo, factura monotributo y quiere comprobantes legibles para ARCA / AFIP cuando deba.'),
    plantillaRow('Propuesta de valor v0',
      'Para inquilinos y propietarios que alquilan en Argentina y se manejan hoy con WhatsApp, Excel y contratos en PDF, Habitta ofrece una plataforma única donde firmar contratos digitales con co-firmantes, pagar y cobrar el alquiler con comprobantes automáticos verificables, contratar prestadores del hogar verificados y resolver conflictos con mediación asistida por IA, a diferencia de ZonaProp (sólo búsqueda), MercadoLibre Inmuebles (sólo publicación) o la inmobiliaria tradicional (cara, lenta, opaca), porque centraliza el ciclo completo, deja trazabilidad legal y baja el costo de la fricción operativa.'),
    plantillaRow('Canal inicial',
      '(1) Comunidades de alquileres en Reddit (r/argentina, r/CABA), grupos de Facebook de "inquilinos CABA" y Twitter — testimonios + landing simple. (2) Alianza con inmobiliarias chicas que necesitan digitalizarse pero no tienen IT — modelo white-label. (3) Boca a boca cruzado — cada contrato firmado en Habitta invita al otro lado del contrato (firmás como inquilino → tu propietario entra a la plataforma sí o sí).'),
    plantillaRow('Hipótesis de monetización',
      '(a) Comisión transaccional 1.5 – 2 % sobre el alquiler procesado (lo paga el lado que cobra). (b) Suscripción Premium $4.000 – $8.000 / mes con funciones extendidas (mediación con IA prioritaria, multi-propiedad, plantillas avanzadas). (c) Comisión 12 – 18 % sobre servicios del hogar contratados a prestadores verificados (revenue share clásico de marketplace). (d) Fee de canal sobre seguros de caución vendidos dentro de la plataforma. Frecuencia: comisión mensual recurrente, servicios on-demand, suscripción mensual.'),
  ],
}));

/* ─── 3. Dos modelos posibles ─── */
sections.push(H1('3. Dos modelos de negocio posibles para la misma idea'));

sections.push(H2('Modelo A — "Marketplace de transacciones" (comisión por uso)'));
sections.push(buildComparisonTable(
  ['Aspecto', 'Detalle'],
  [
    ['Quién usa',          'Inquilino, propietario, prestador'],
    ['Quién paga',         'El lado que cobra una transacción (propietario sobre el alquiler, prestador sobre el servicio)'],
    ['Cómo se cobra',      'Comisión 1.5 – 2 % sobre alquileres procesados + 12-18 % sobre servicios del hogar'],
    ['Frecuencia',         'Recurrente mensual (alquiler) + on-demand (servicios)'],
    ['Velocidad para validar', 'Rápida — con 5 contratos activos y 20 servicios contratados ya hay señal real'],
    ['Ventajas',           'Bajo friction (gratis usar), incentivos alineados con el éxito del usuario, escalable'],
    ['Riesgos',            'Necesita volumen para ser rentable, depende del procesador de pagos (MP), márgenes finos'],
  ],
));

sections.push(H2('Modelo B — "SaaS B2B inmobiliarias" (suscripción por agencia)'));
sections.push(buildComparisonTable(
  ['Aspecto', 'Detalle'],
  [
    ['Quién usa',          'Empleados de inmobiliaria + sus clientes (inquilinos / propietarios)'],
    ['Quién paga',         'La agencia inmobiliaria'],
    ['Cómo se cobra',      'Suscripción mensual USD 50 – 150 por agencia + cargo por propiedad bajo gestión'],
    ['Frecuencia',         'Suscripción mensual recurrente con contratos anuales'],
    ['Velocidad para validar', 'Lenta — ciclo de venta B2B de 4-8 semanas, demo, onboarding'],
    ['Ventajas',           'Ingreso predecible alto, ticket grande, contratos anuales, expansion por # de propiedades'],
    ['Riesgos',            'Ciclo de venta largo, competencia con Tokko, churn alto si no la adoptan, requiere equipo comercial'],
  ],
));

/* ─── 4. Modelo elegido ─── */
sections.push(H1('4. Modelo elegido para empezar y justificación'));
sections.push(P('Arranco con el Modelo A (marketplace de transacciones) con una capa SaaS Premium opcional ($4.000 – $8.000 / mes) para usuarios power, que sirve como puente hacia el B2B más adelante.', { run: { bold: true } }));
sections.push(P('Por qué este orden:', { run: { bold: true, color: COL.terra } }));
sections.push(numbered('**Aprendo más rápido** — con 10 contratos firmados y 50 servicios contratados ya tengo señales claras de qué funciona, sin esperar 6 meses para cerrar un contrato anual con una agencia.'));
sections.push(numbered('**Reduzco la barrera de entrada** — el inquilino/propietario no paga nada para empezar (sólo si transacciona), así que el costo psicológico es mínimo.'));
sections.push(numbered('**Genera viralidad endógena** — cada vez que un inquilino firma en Habitta, el propietario también entra. El crecimiento es cruzado y no depende sólo de marketing.'));
sections.push(numbered('**El SaaS B2B viene después como expansión natural** — cuando demuestre que 200 inmuebles activos funcionan, las inmobiliarias chicas van a querer la plataforma white-label y ahí cobramos suscripción.'));
sections.push(numbered('**Coincide con el momento del usuario** — el dolor agudo aparece cuando se firma un contrato, cuando hay que pagar el alquiler o cuando se rompe algo. Cobrar en ese momento es defendible; cobrar suscripción mensual a alguien que firma cada 24 meses es muy pesado para empezar.'));

/* ─── 5. Hipótesis críticas ─── */
sections.push(H1('5. Tres hipótesis críticas a validar'));
sections.push(new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [Math.round(CONTENT_WIDTH * 0.16), Math.round(CONTENT_WIDTH * 0.42), CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.16) - Math.round(CONTENT_WIDTH * 0.42)],
  rows: [
    new TableRow({ tableHeader: true, children: [
      cell({ text: 'Tipo',       width: Math.round(CONTENT_WIDTH * 0.16), bg: COL.deep, bold: true, color: 'FFFFFF' }),
      cell({ text: 'Hipótesis',  width: Math.round(CONTENT_WIDTH * 0.42), bg: COL.deep, bold: true, color: 'FFFFFF' }),
      cell({ text: 'Cómo testear', width: CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.16) - Math.round(CONTENT_WIDTH * 0.42), bg: COL.deep, bold: true, color: 'FFFFFF' }),
    ]}),
    new TableRow({ children: [
      cell({ text: 'Cliente', width: Math.round(CONTENT_WIDTH * 0.16), bg: COL.beige, bold: true }),
      cell({ text: 'Los inquilinos jóvenes urbanos (25-45) sienten suficiente dolor con el método actual (Excel + WhatsApp + transferencia) como para registrarse y probar una plataforma nueva sin que se la recomienden directamente.', width: Math.round(CONTENT_WIDTH * 0.42) }),
      cell({ text: 'Landing con form de waitlist + 30 entrevistas cualitativas en 4 semanas. Objetivo: ≥ 40 % conversión visita→waitlist y ≥ 7/10 en "¿qué tan frustrado estás con cómo manejás tu alquiler hoy?".', width: CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.16) - Math.round(CONTENT_WIDTH * 0.42) }),
    ]}),
    new TableRow({ children: [
      cell({ text: 'Valor', width: Math.round(CONTENT_WIDTH * 0.16), bg: COL.beige, bold: true }),
      cell({ text: 'Una vez registrados, los usuarios cargan su contrato + 1 mes de pagos en los primeros 7 días. Si no, la plataforma es vista como "un Excel más lindo" y no aporta valor real.', width: Math.round(CONTENT_WIDTH * 0.42) }),
      cell({ text: 'MVP con 50 usuarios beta. Métricas: ≥ 60 % completa onboarding + ≥ 40 % registra ≥ 1 pago en la 1ra semana + NPS ≥ 30.', width: CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.16) - Math.round(CONTENT_WIDTH * 0.42) }),
    ]}),
    new TableRow({ children: [
      cell({ text: 'Monetización', width: Math.round(CONTENT_WIDTH * 0.16), bg: COL.beige, bold: true }),
      cell({ text: 'Los usuarios aceptan pagar 1.5 % de comisión sobre el alquiler procesado por las garantías extra (contrato digital + comprobante automático + custodia neutral del depósito). Si exigen que sea gratis, todo el modelo se cae.', width: Math.round(CONTENT_WIDTH * 0.42) }),
      cell({ text: 'Test A/B con 2 cohortes: una recibe procesamiento gratis, la otra con 1.5 %. Métrica: ≥ 70 % de la cohorte que paga acepta sin abandonar después del 2do mes. Alternativa: precio anclado en "¿pagarías $X por seguro + comprobante + custodia?" en entrevistas.', width: CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.16) - Math.round(CONTENT_WIDTH * 0.42) }),
    ]}),
  ],
}));

/* ─── 6. Uso de IA ─── */
sections.push(H1('6. Uso de IA'));
sections.push(new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [Math.round(CONTENT_WIDTH * 0.30), CONTENT_WIDTH - Math.round(CONTENT_WIDTH * 0.30)],
  rows: [
    plantillaRow('Herramienta',
      'Claude (Anthropic) en modo agente sobre el repositorio completo del proyecto. Usado tanto para construir código como para estructurar decisiones estratégicas y redactar este documento.'),
    plantillaRow('Para qué se usó',
      '(a) Construcción del MVP funcional: arquitectura, schema Prisma, módulos NestJS, frontend Next 15 con paleta y branding propios, sistema de tickets de soporte, recibos con verificación pública sha256, contratos con co-firmantes, visitas con calendario, marketplace de servicios, custodia de depósitos. ' +
      '(b) Discusión estratégica: me ayudó a descartar la idea de "hacer nuestro propio procesador de pagos" mostrándome el costo regulatorio real (PCI-DSS Level 1, regulación BCRA / PSPCP, capital de trabajo para float) antes de gastar plata y meses, y a elegir Mercado Pago Marketplace + Split. ' +
      '(c) Redacción de este documento.'),
    plantillaRow('Decisiones que tomé yo, no la IA',
      '(1) Nombre, branding y paleta (Habitta + colores tierra) — los elegí yo a partir de un moodboard, la IA solo armó el código del logo. ' +
      '(2) Alcance del MVP — Argentina primero, foco en CABA / GBA, cumplimiento Ley 27.551 — por análisis de mercado propio. ' +
      '(3) Decisión de no ser PSP propio — la IA me explicó costos y opciones, la decisión final fue mía. ' +
      '(4) Los dos modelos comparados acá son míos a partir de discusión con la IA; la elección final entre A y B la tomé considerando velocidad de aprendizaje y runway personal. ' +
      '(5) Las hipótesis críticas — la IA propuso 10, yo elegí estas 3 porque son las que más riesgo concentran.'),
  ],
}));

/* ─── ANEXO ─── */
sections.push(new Paragraph({ children: [new PageBreak()] }));
sections.push(H1('Anexo · Estado actual del MVP'));
sections.push(P('Para validar las hipótesis no parto de cero: ya hay un MVP funcional desplegado y testeable. Stack:'));
sections.push(bullet('**Frontend**: Next.js 15 (App Router) + React 19 + Tailwind con paleta Habitta propia · 3 idiomas (ES/EN/PT)'));
sections.push(bullet('**Backend**: NestJS 10 + Prisma 6 + PostgreSQL en Neon (prod) · 30+ módulos · 220+ endpoints REST'));
sections.push(bullet('**Pagos**: Mercado Pago real integrado (preferencias + webhook + split listo para activar)'));
sections.push(bullet('**Deploy**: Render con CI/CD desde GitHub · cada push redespliega automáticamente'));
sections.push(P('Funcionalidad ya construida y funcionando end-to-end:', { run: { bold: true, color: COL.terra } }));
sections.push(bullet('Registro multi-rol (Inquilino, Propietario, Inmobiliaria, Prestador, Particular) con verificación de identidad (KYC) explicada en lenguaje no técnico'));
sections.push(bullet('Búsqueda y publicación de inmuebles con ~38 amenities agrupadas en 4 categorías'));
sections.push(bullet('Visitas a propiedades con calendario, contraoferta de fecha (max 6 rondas) y vista de calendario mensual'));
sections.push(bullet('Solicitud de alquiler con contraoferta de monto / duración / fecha de inicio (negociación con rondas)'));
sections.push(bullet('Contratos digitales con plantillas Ley 27.551 + co-firmantes invitables por email + gate de datos del usuario para firmar'));
sections.push(bullet('Pagos por Mercado Pago real + comprobantes NO fiscales con hash sha256 y página pública de verificación'));
sections.push(bullet('Presupuesto mensual del Particular con división de gastos (alquiler / expensas / servicios) con freeze y débito automático'));
sections.push(bullet('Marketplace de 30+ rubros de servicios del hogar verificados, con categoría "Otro" para los que no encajan'));
sections.push(bullet('Custodia neutral de depósitos de garantía con admin de inversiones (banco, plazo, TNA)'));
sections.push(bullet('Sistema de tickets de soporte categorizados (8 temas con sub-temas) usuario ↔ admin con hilo tipo chat'));
sections.push(bullet('Mediación de conflictos asistida por IA basada en jurisprudencia argentina real'));
sections.push(bullet('Cierre de cuenta (soft-delete) que preserva la información histórica (cumple obligaciones legales y contables)'));
sections.push(P('Esto permite empezar a testear las 3 hipótesis críticas directamente con usuarios reales, sin tener que pagar para validar primero con maquetas.', { run: { italics: true } }));

/* ════════════════════════════════════════════════════════════
   DOCUMENT
   ════════════════════════════════════════════════════════════ */

const doc = new Document({
  creator: 'Fernando Isasti',
  title: 'TP2 — Modelo de negocio y propuesta de valor — Habitta',
  description: 'UCEMA MADE 2026 · Ideación y Gestión de Startups',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: COL.deep, font: 'Calibri' },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: COL.terra, font: 'Calibri' },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: 'numbers',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },  // A4
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    children: sections,
  }],
});

const OUT = path.join(__dirname, 'TP2-Habitta-FernandoIsasti.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('✅ Generado:', OUT);
  console.log('   Tamaño:', (buf.length / 1024).toFixed(1), 'KB');
});
