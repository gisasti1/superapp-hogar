/**
 * Plantillas built-in de contratos.
 * El texto sigue los lineamientos de la Ley 27.551 (Argentina) y usa
 * placeholders {{variable}} que el servicio reemplaza antes de mostrar.
 *
 * Variables disponibles:
 *   {{landlordName}}    - Nombre y apellido del locador
 *   {{landlordDni}}     - DNI/CUIT del locador
 *   {{landlordAddress}} - Domicilio real del locador
 *   {{tenantName}}      - Nombre y apellido del locatario
 *   {{tenantDni}}       - DNI/CUIT del locatario
 *   {{tenantAddress}}   - Domicilio real del locatario
 *   {{address}}         - Dirección del inmueble objeto del contrato
 *   {{city}}            - Ciudad del inmueble
 *   {{province}}        - Provincia del inmueble
 *   {{rooms}}           - Cantidad de ambientes
 *   {{startDate}}       - Fecha de inicio (dd/mm/aaaa)
 *   {{endDate}}         - Fecha de fin (dd/mm/aaaa)
 *   {{monthlyRent}}     - Importe del alquiler mensual
 *   {{currency}}        - Moneda (ARS / USD)
 *   {{deposit}}         - Importe del depósito en garantía
 *   {{today}}           - Fecha de firma (dd/mm/aaaa)
 */

export const BUILT_IN_TEMPLATES = [
  {
    id: 'tpl-residential-std',
    title: 'Locación residencial — Ley 27.551 (estándar)',
    description: 'Contrato de locación para uso habitacional. Plazo mínimo de 3 años conforme Ley 27.551. Ideal para alquileres de departamentos y casas.',
    type: 'RESIDENTIAL',
    isBuiltIn: true,
    content: `CONTRATO DE LOCACIÓN PARA USO HABITACIONAL
Ley N° 27.551 — Código Civil y Comercial de la Nación

En la ciudad de {{city}}, Provincia de {{province}}, a los {{today}}, entre:

LOCADOR/A: {{landlordName}}, D.N.I. N° {{landlordDni}}, con domicilio real en {{landlordAddress}}, en adelante denominado/a "el/la Locador/a";

y

LOCATARIO/A: {{tenantName}}, D.N.I. N° {{tenantDni}}, con domicilio real en {{tenantAddress}}, en adelante denominado/a "el/la Locatario/a";

convienen celebrar el presente contrato de locación, sujeto a las siguientes cláusulas y condiciones:

──────────────────────────────────────────────
PRIMERA — OBJETO
─────────────────────────���────────────────────
El/la Locador/a da en locación al/a la Locatario/a, el inmueble ubicado en {{address}}, ciudad de {{city}}, provincia de {{province}}, compuesto por {{rooms}} ambiente/s, para uso exclusivamente habitacional, quedando expresamente prohibido cualquier destino comercial, industrial o profesional.

──────────────────────────────────────────────
SEGUNDA — PLAZO
──────────────────────────────────────────────
La locación se acuerda por el término de TRES (3) AÑOS, conforme lo dispuesto por el artículo 1198 del Código Civil y Comercial de la Nación y el artículo 6° de la Ley N° 27.551. El contrato comenzará el día {{startDate}} y finalizará el día {{endDate}}, fecha en que el/la Locatario/a deberá restituir el inmueble en las mismas condiciones en que lo recibió.

──────────────────────────────────────────────
TERCERA — PRECIO Y FORMA DE PAGO
──────────────────────────────────────────────
El precio de la locación se fija en la suma de {{currency}} {{monthlyRent}} (pesos/dólares {{monthlyRent}}) mensuales.

Los ajustes del precio se realizarán de conformidad con lo establecido en el artículo 14 de la Ley N° 27.551, aplicando el Índice para Contratos de Locación (ICL) publicado por el Banco Central de la República Argentina (BCRA), con periodicidad anual.

El pago deberá efectuarse dentro de los primeros CINCO (5) días hábiles de cada mes, mediante transferencia bancaria o depósito a la cuenta que el/la Locador/a indique. El recibo constituye el único instrumento válido de pago.

──────────────────────────────────────────────
CUARTA — DEPÓSITO EN GARANTÍA
──────────────────────────────────────────────
El/la Locatario/a entrega en este acto la suma de {{currency}} {{deposit}} en concepto de depósito en garantía, equivalente a UN (1) mes de alquiler, conforme lo dispuesto por el artículo 13 de la Ley N° 27.551. Dicha suma será devuelta al/a la Locatario/a, sin intereses, dentro de los TREINTA (30) días corridos de restituido el inmueble y una vez verificado que no existen daños ni deudas pendientes.

──────────────────────────────────────────────
QUINTA — ESTADO DEL INMUEBLE
──────────────────────────────────────────────
El/la Locatario/a declara recibir el inmueble en buen estado de conservación y habitabilidad. En caso de detectar vicios o defectos ocultos, deberá notificarlos fehacientemente al/a la Locador/a dentro de los DIEZ (10) días corridos de tomada la posesión.

──────────────────────────────────────────────
SEXTA — OBLIGACIONES DEL LOCATARIO
──────────────────────────────────────────────
El/la Locatario/a se obliga a:
a) Destinar el inmueble exclusivamente al uso habitacional convenido.
b) Abonar en tiempo y forma el precio de la locación.
c) Pagar los servicios (luz, gas, agua, internet, expensas ordinarias) que le correspondan.
d) No realizar obras ni modificaciones sin autorización escrita del/de la Locador/a.
e) Permitir el acceso al inmueble al/a la Locador/a o sus representantes, con previo aviso de 48 horas, a los efectos de verificar su estado.
f) Restituir el inmueble en iguales condiciones al recibirlo, salvo el desgaste normal por el uso.
g) No subarrendar ni ceder el contrato sin consentimiento expreso del/de la Locador/a.

──────────────────────────────────────────────
SÉPTIMA — OBLIGACIONES DEL LOCADOR
──────────────────────────────────────────────
El/la Locador/a se obliga a:
a) Mantener el inmueble en condiciones de habitabilidad durante todo el plazo locativo.
b) Realizar las reparaciones estructurales y de instalaciones que correspondan por deterioro no imputable al/a la Locatario/a.
c) Garantizar el uso pacífico del inmueble.
d) Pagar las expensas extraordinarias y los impuestos que graven el inmueble.

──────────────────────────────────────────────
OCTAVA — RESCISIÓN ANTICIPADA
──────────────────────────────────────────────
Conforme el artículo 1221 del Código Civil y Comercial de la Nación, el/la Locatario/a podrá rescindir el contrato anticipadamente, notificando con TREINTA (30) días de anticipación. Si la rescisión se produce antes de los SEIS (6) meses, deberá abonar al/a la Locador/a una indemnización equivalente a UN Y MEDIO (1,5) meses de alquiler. Transcurrido ese plazo, la indemnización será equivalente a UN (1) mes de alquiler.

──────────────────────────────────────────────
NOVENA — RENOVACIÓN
──────────────────────────────────────────────
Con una antelación no inferior a NOVENTA (90) días al vencimiento, las partes podrán acordar la renovación del contrato bajo nuevas condiciones. En caso de no existir acuerdo, el/la Locatario/a deberá restituir el inmueble en la fecha de vencimiento estipulada.

──────────────────────────────────────────────
DÉCIMA — DOMICILIOS
──────────────────────────────────────────────
A todos los efectos legales emergentes del presente contrato, las partes constituyen domicilio: el/la Locador/a en {{landlordAddress}}; el/la Locatario/a en el inmueble objeto de locación ({{address}}), o en {{tenantAddress}} en caso de desocupación.

──────────────────────────────────────────────
DÉCIMO PRIMERA — JURISDICCIÓN
──────────────────────────────────────────────
Para cualquier controversia que pudiera suscitarse con motivo del presente contrato, las partes se someten a la jurisdicción ordinaria de los Tribunales de la ciudad de {{city}}, renunciando expresamente a cualquier otro fuero o jurisdicción.

──────────────────────────────────────────────
FIRMAS
──────────────────────────────────────────────
En prueba de conformidad, las partes firman el presente contrato en dos (2) ejemplares de un mismo tenor y a un solo efecto, en el lugar y fecha indicados al comienzo.


_________________________________          _________________________________
LOCADOR/A                                  LOCATARIO/A
{{landlordName}}                           {{tenantName}}
D.N.I. {{landlordDni}}                     D.N.I. {{tenantDni}}
`,
  },

  {
    id: 'tpl-residential-furnished',
    title: 'Locación residencial — Inmueble amoblado',
    description: 'Contrato residencial para inmueble entregado con muebles y electrodomésticos. Incluye inventario y cláusulas de responsabilidad por los bienes.',
    type: 'RESIDENTIAL',
    isBuiltIn: true,
    content: `CONTRATO DE LOCACIÓN PARA USO HABITACIONAL — INMUEBLE AMOBLADO
Ley N° 27.551 — Código Civil y Comercial de la Nación

En la ciudad de {{city}}, Provincia de {{province}}, a los {{today}}, entre:

LOCADOR/A: {{landlordName}}, D.N.I. N° {{landlordDni}}, con domicilio real en {{landlordAddress}};

y

LOCATARIO/A: {{tenantName}}, D.N.I. N° {{tenantDni}}, con domicilio real en {{tenantAddress}};

convienen el presente contrato de locación de inmueble amoblado, sujeto a las condiciones que se detallan:

──────────────────────────────────────────────
PRIMERA — OBJETO
──────────────────────────────────────────────
El/la Locador/a da en locación el inmueble ubicado en {{address}}, {{city}}, junto con los muebles, artefactos y electrodomésticos detallados en el Inventario adjunto como Anexo I, que forma parte integrante del presente.

──────────────────────────────────────────────
SEGUNDA — PLAZO
──────────────────────────────────────────────
La locación se acuerda por el término de TRES (3) AÑOS, desde el {{startDate}} hasta el {{endDate}}.

──────────────────────────────────────────────
TERCERA — PRECIO
──────────────────────────────────────────────
El precio mensual se fija en {{currency}} {{monthlyRent}}. Los ajustes anuales se aplicarán conforme el Índice ICL del BCRA (Ley 27.551, art. 14).

──────────────────────────────────────────────
CUARTA — DEPÓSITO EN GARANTÍA
──────────────────────────────────────────────
El/la Locatario/a abona {{currency}} {{deposit}} en concepto de depósito, reembolsable en las condiciones del art. 13 de la Ley 27.551.

──────────────────────────────────────────────
QUINTA — RESPONSABILIDAD POR LOS BIENES MUEBLES
──────────────────────────────────────────────
El/la Locatario/a recibe los bienes descriptos en el Inventario (Anexo I) en buen estado de conservación y funcionamiento. Al finalizar el contrato, deberá devolverlos en igual estado, salvo desgaste razonable por uso. Los daños o roturas que excedan el desgaste normal serán descontados del depósito en garantía, previa tasación acordada.

──────────────────────────────────────────────
SEXTA — REPARACIONES
──────────────────────────────────────────────
Las reparaciones menores de los bienes muebles (inferiores a {{currency}} 20.000) serán a cargo del/de la Locatario/a. Las reparaciones mayores o reposición por fin de vida útil correrán por cuenta del/de la Locador/a.

──────────────────────────────────────────────
SÉPTIMA A UNDÉCIMA
──────────────────────────────────────────────
[Idénticas a las cláusulas del contrato estándar residencial — Obligaciones del Locatario, Obligaciones del Locador, Rescisión anticipada, Renovación, Domicilios y Jurisdicción en {{city}}]

──────────────────────────────────────────────
ANEXO I — INVENTARIO DE BIENES MUEBLES
──────────────────────────────────────────────
[Completar con detalle de muebles, electrodomésticos y su estado al momento de la entrega]

Ejemplo:
- Heladera marca _____, modelo _____, estado: bueno
- Lavarropas marca _____, modelo _____, estado: bueno
- Cocina _____ hornallas, estado: bueno
- Cama 2 plazas, colchón, estado: bueno
- Mesa comedor + 4 sillas, estado: bueno
- Calefactor _____, estado: bueno


_________________________________          _________________________________
LOCADOR/A                                  LOCATARIO/A
{{landlordName}}                           {{tenantName}}
D.N.I. {{landlordDni}}                     D.N.I. {{tenantDni}}
`,
  },

  {
    id: 'tpl-commercial',
    title: 'Locación comercial',
    description: 'Contrato para uso comercial, oficinas o local. Plazo mínimo de 3 años. Cláusulas específicas para actividad comercial y habilitación municipal.',
    type: 'COMMERCIAL',
    isBuiltIn: true,
    content: `CONTRATO DE LOCACIÓN PARA USO COMERCIAL
Código Civil y Comercial de la Nación — Arts. 1187 y ss.

En la ciudad de {{city}}, Provincia de {{province}}, a los {{today}}, entre:

LOCADOR/A: {{landlordName}}, D.N.I./CUIT N° {{landlordDni}}, con domicilio real en {{landlordAddress}}, en adelante "el/la Locador/a";

y

LOCATARIO/A: {{tenantName}}, D.N.I./CUIT N° {{tenantDni}}, con domicilio real en {{tenantAddress}}, en adelante "el/la Locatario/a";

acuerdan celebrar el presente contrato de locación con destino comercial:

──────────────────────────────────────────────
PRIMERA — OBJETO Y DESTINO
──────────────────────────────────────────────
El/la Locador/a da en locación el local comercial ubicado en {{address}}, {{city}}, para uso exclusivo de: [DESCRIBIR ACTIVIDAD COMERCIAL]. Cualquier cambio de destino requerirá autorización escrita del/de la Locador/a.

──────────────────────────────────────────────
SEGUNDA — PLAZO
──────────────────────────────────────────────
La locación se acuerda por TRES (3) AÑOS, desde el {{startDate}} hasta el {{endDate}}.

──────────────────────────────────────────────
TERCERA — PRECIO Y AJUSTE
──────────────────────────────────────────────
El alquiler mensual se fija en {{currency}} {{monthlyRent}}. Las partes acuerdan ajuste [SEMESTRAL / ANUAL] mediante el índice [ICL-BCRA / IPC-INDEC / ACUERDO DE PARTES: ____%]. El nuevo valor entrará en vigencia el primer día del período siguiente a la notificación fehaciente.

──────────────────────────────────────────────
CUARTA — DEPÓSITO EN GARANTÍA
──────────────────────────────────────────────
El/la Locatario/a abona {{currency}} {{deposit}} como depósito en garantía, reintegrable al fin del contrato sin deudas ni daños.

──────────────────────────────────────────────
QUINTA — HABILITACIÓN MUNICIPAL
──────────────────────────────────────────────
El/la Locatario/a es exclusivamente responsable de obtener y mantener vigente la habilitación municipal para el desarrollo de su actividad. El/la Locador/a no garantiza la habilitabilidad del local para el destino indicado. Los costos de adecuación a la normativa corren por cuenta del/de la Locatario/a.

──────────────────────────────────────────────
SEXTA — OBRAS Y MEJORAS
──────────────────────────────────────────────
Toda obra o mejora requerirá autorización escrita previa del/de la Locador/a. Las mejoras quedarán en beneficio del inmueble sin derecho a indemnización, salvo pacto expreso en contrario. El/la Locatario/a deberá restituir el local en su estado original si así lo solicita el/la Locador/a.

──────────────────────────────────────────────
SÉPTIMA — EXPENSAS Y SERVICIOS
──────────────────────────────────────────────
Las expensas ordinarias, el ABL/impuesto inmobiliario (en proporción acordada) y todos los servicios (luz, gas, agua, internet, limpieza) estarán a cargo del/de la Locatario/a, salvo pacto en contrario.

──────────────────────────────────────────────
OCTAVA — RESCISIÓN ANTICIPADA
──────────────────────────────────────────────
Cualquiera de las partes podrá rescindir el contrato con NOVENTA (90) días de notificación fehaciente. La parte que rescinda antes del plazo mínimo abonará una compensación equivalente a DOS (2) meses de alquiler vigente.

──────────────────────────────────────────────
NOVENA — DOMICILIOS Y JURISDICCIÓN
──────────────────────────────────────────────
Las partes constituyen domicilio en los indicados al comienzo y se someten a los Tribunales ordinarios de {{city}} para toda controversia.


_________________________________          _________________________________
LOCADOR/A                                  LOCATARIO/A
{{landlordName}}                           {{tenantName}}
D.N.I./CUIT {{landlordDni}}                D.N.I./CUIT {{tenantDni}}
`,
  },

  {
    id: 'tpl-seasonal',
    title: 'Locación temporaria (turismo / temporada)',
    description: 'Para alquileres de corta duración hasta 3 meses. No requiere depósito en garantía. Uso turístico o de temporada.',
    type: 'SEASONAL',
    isBuiltIn: true,
    content: `CONTRATO DE LOCACIÓN TEMPORARIA
Art. 1199 CCyC — Uso turístico y recreativo

En {{city}}, a los {{today}}, entre:

LOCADOR/A: {{landlordName}}, D.N.I. {{landlordDni}}, domicilio: {{landlordAddress}};
LOCATARIO/A: {{tenantName}}, D.N.I. {{tenantDni}}, domicilio: {{tenantAddress}};

──────────────────────────────────────────────
PRIMERA — OBJETO
──────────────────────────────────────────────
El/la Locador/a cede temporariamente el uso del inmueble ubicado en {{address}}, {{city}}, para uso turístico / vacacional, completamente amoblado y equipado.

──────────────────────────────────────────────
SEGUNDA — PLAZO
──────────────────────────────────────────────
La locación es por el período comprendido entre el {{startDate}} y el {{endDate}} (MÁXIMO 3 MESES, conforme art. 1199 CCyC). Vencido el plazo, el/la Locatario/a deberá desocupar sin necesidad de intimación.

──────────────────────────────────────────────
TERCERA — PRECIO
──────────────────────────────────────────────
El precio total de la locación se fija en {{currency}} {{monthlyRent}} por período (o {{currency}} {{monthlyRent}} mensuales). El pago es ANTICIPADO, abonándose el 100% al momento de la firma o al check-in. No procede ajuste por inflación dada la corta duración.

──────────────────────────────────────────────
CUARTA — SEÑA / GARANTÍA
──────────────────────────────────────────────
El/la Locatario/a abona {{currency}} {{deposit}} en concepto de garantía por daños, reintegrable dentro de las 72 hs del check-out, descontando los daños comprobados.

──────────────────────────────────────────────
QUINTA — CONDICIONES DE USO
──────────────────────────────────────────────
a) Capacidad máxima: [N° DE PERSONAS]. No se admiten mascotas salvo autorización expresa.
b) Queda prohibido realizar fiestas o eventos que superen la capacidad indicada.
c) El horario de check-in es a partir de las [HORA] y el check-out hasta las [HORA].
d) El/la Locatario/a recibirá el inmueble con el inventario adjunto y lo devolverá en idénticas condiciones.

─────────────────────────���────────────────────
SEXTA — SERVICIOS INCLUIDOS
──────────────────────────────────────────────
[Indicar qué está incluido: wifi, agua caliente, gas, ropa de cama, limpieza final, etc.]

──────────────────────────────────────────────
SÉPTIMA — CANCELACIÓN
──────────────────────────────────────────────
Cancelación con más de 15 días de anticipación: reintegro del 80% del importe abonado.
Cancelación entre 7 y 15 días: reintegro del 50%.
Cancelación con menos de 7 días: sin reintegro.

──────────────────────────────────────────────
OCTAVA — JURISDICCIÓN
──────────────────────────────────────────────
Ante cualquier controversia, las partes se someten a la jurisdicción de los Tribunales de {{city}}.


_________________________________          _________________________________
LOCADOR/A                                  LOCATARIO/A
{{landlordName}}                           {{tenantName}}
`,
  },
];

export const TEMPLATE_VARIABLES = [
  { key: '{{landlordName}}',    label: 'Nombre del locador' },
  { key: '{{landlordDni}}',     label: 'DNI/CUIT del locador' },
  { key: '{{landlordAddress}}', label: 'Domicilio del locador' },
  { key: '{{tenantName}}',      label: 'Nombre del locatario' },
  { key: '{{tenantDni}}',       label: 'DNI/CUIT del locatario' },
  { key: '{{tenantAddress}}',   label: 'Domicilio del locatario' },
  { key: '{{address}}',         label: 'Dirección del inmueble' },
  { key: '{{city}}',            label: 'Ciudad' },
  { key: '{{province}}',        label: 'Provincia' },
  { key: '{{rooms}}',           label: 'Ambientes' },
  { key: '{{startDate}}',       label: 'Fecha de inicio' },
  { key: '{{endDate}}',         label: 'Fecha de fin' },
  { key: '{{monthlyRent}}',     label: 'Alquiler mensual' },
  { key: '{{currency}}',        label: 'Moneda' },
  { key: '{{deposit}}',         label: 'Depósito en garantía' },
  { key: '{{today}}',           label: 'Fecha de firma' },
];
