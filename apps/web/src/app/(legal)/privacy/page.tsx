export const metadata = { title: 'Política de privacidad — habitta' };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de privacidad</h1>
      <p className="text-sm text-gray-400 mb-8">Última actualización: mayo 2026</p>

      <h2>1. Datos que recolectamos</h2>
      <p>
        habitta (en adelante, "la plataforma") recolecta los siguientes datos personales
        cuando creás una cuenta y usás el servicio:
      </p>
      <ul>
        <li><strong>Datos de identificación:</strong> nombre, apellido, email, teléfono, DNI</li>
        <li><strong>Datos de propiedades:</strong> dirección, características, fotos, ubicación geográfica</li>
        <li><strong>Datos contractuales:</strong> términos de alquiler, pagos, firmas digitales</li>
        <li><strong>Datos de uso:</strong> logs de acceso, dirección IP, navegador</li>
      </ul>

      <h2>2. Cómo los usamos</h2>
      <ul>
        <li>Verificar tu identidad con RENAPER y proveedores de KYC</li>
        <li>Procesar pagos a través de Mercado Pago y otros procesadores</li>
        <li>Generar contratos digitales con validez legal</li>
        <li>Cumplir con obligaciones fiscales y legales (Ley 25.326 y normativa AFIP)</li>
      </ul>

      <h2>3. Con quién los compartimos</h2>
      <p>
        Compartimos tus datos únicamente con: Mercado Pago (pagos), RENAPER (verificación),
        Finaer/Experta (pólizas de caución), DocuSign (firmas), Anthropic (procesamiento de
        casos de mediación) y la AFIP cuando la ley lo requiere.
      </p>
      <p>
        <strong>Nunca vendemos tus datos a terceros con fines publicitarios.</strong>
      </p>

      <h2>4. Tus derechos (Ley 25.326)</h2>
      <p>Tenés derecho a:</p>
      <ul>
        <li>Acceder a tus datos personales en cualquier momento</li>
        <li>Solicitar la rectificación o eliminación de tus datos</li>
        <li>Oponerte al tratamiento de tus datos</li>
        <li>Portabilidad de tus datos a otra plataforma</li>
      </ul>
      <p>
        Para ejercer estos derechos, escribinos a <a href="mailto:privacidad@superapphogar.com" className="text-habitta-terra">privacidad@superapphogar.com</a>.
      </p>

      <h2>5. Seguridad</h2>
      <p>
        Las contraseñas se almacenan hasheadas con bcrypt (12 rondas). Todas las comunicaciones
        van sobre TLS 1.2+. Tu DNI y datos sensibles se cifran en la base de datos.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Usamos cookies de sesión esenciales para el funcionamiento del login. No usamos cookies
        de publicidad ni de tracking de terceros.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Si tenés dudas sobre esta política, contactanos a
        <a href="mailto:hola@superapphogar.com" className="text-habitta-terra"> hola@superapphogar.com</a>.
      </p>

      <p className="text-xs text-gray-400 mt-8 italic">
        Esta política es un texto de referencia. Para uso en producción real consultá con un
        abogado especialista en protección de datos personales.
      </p>
    </>
  );
}
