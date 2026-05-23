export const metadata = { title: 'Términos y condiciones — SuperApp Hogar' };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos y condiciones</h1>
      <p className="text-sm text-gray-400 mb-8">Última actualización: mayo 2026</p>

      <h2>1. Aceptación</h2>
      <p>
        Al crear una cuenta o usar SuperApp Hogar aceptás estos términos. Si no estás de acuerdo,
        no uses el servicio.
      </p>

      <h2>2. Naturaleza del servicio</h2>
      <p>
        SuperApp Hogar es una plataforma tecnológica que conecta inquilinos, propietarios e
        inmobiliarias, facilitando: publicación de inmuebles, firma digital de contratos,
        gestión de pagos, contratación de seguros de caución, mediación asistida por IA y
        marketplace de servicios del hogar.
      </p>
      <p>
        <strong>No somos parte del contrato de locación entre inquilinos y propietarios.</strong>
        Actuamos como facilitador tecnológico.
      </p>

      <h2>3. Cuenta de usuario</h2>
      <ul>
        <li>Debés tener al menos 18 años</li>
        <li>Sos responsable de la seguridad de tu contraseña</li>
        <li>Los datos que ingresás deben ser verídicos</li>
        <li>Nos reservamos el derecho de suspender cuentas con datos falsos o actividad sospechosa</li>
      </ul>

      <h2>4. Contratos digitales</h2>
      <p>
        Los contratos firmados a través de la plataforma cumplen con la Ley 25.506 de Firma Digital
        y son válidos legalmente. La trazabilidad incluye hash, IP, timestamp y certificado del
        firmante.
      </p>

      <h2>5. Pagos</h2>
      <p>
        Los pagos se procesan a través de Mercado Pago. La plataforma cobra una comisión por
        transacción que se detalla antes de la confirmación. Los fondos de depósitos en garantía
        se mantienen en custodia con doble entrada contable.
      </p>

      <h2>6. Mediación con IA</h2>
      <p>
        El servicio de mediación con IA emite propuestas no vinculantes basadas en el Código Civil
        y Comercial argentino (arts. 1187-1226). Las propuestas son orientativas y no reemplazan
        el asesoramiento legal profesional ni la jurisdicción de los tribunales competentes.
      </p>

      <h2>7. Seguro de caución</h2>
      <p>
        Las pólizas son emitidas por compañías aseguradoras autorizadas (Finaer, Experta, etc).
        SuperApp Hogar actúa como intermediario; los términos específicos de cada póliza son
        responsabilidad de la aseguradora.
      </p>

      <h2>8. Plan Premium</h2>
      <p>
        El plan Premium se factura mensualmente. Podés cancelar en cualquier momento y el cargo
        no se renovará al siguiente período.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        SuperApp Hogar no es responsable por: el estado real de los inmuebles publicados, el
        cumplimiento de los contratos entre las partes, fallas de servicios de terceros
        (Mercado Pago, RENAPER, etc.) ni por daños indirectos derivados del uso de la plataforma.
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        Podemos modificar estos términos. Te avisaremos por email con al menos 30 días de
        anticipación. El uso continuado del servicio implica aceptación de los nuevos términos.
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será
        resuelta en los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.
      </p>

      <p className="text-xs text-gray-400 mt-8 italic">
        Estos términos son un texto de referencia. Para uso en producción real consultá con un
        abogado.
      </p>
    </>
  );
}
