# TacEtarip Frontend

Aplicación web responsive de TacEtarip para administrar clientes, productos, ventas, citas, pagos e integraciones desde escritorio o móvil.

## Tecnologías

- Angular 21.2 con componentes standalone.
- Ionic 8 para navegación y controles adaptables.
- TypeScript y SCSS.
- Vitest para pruebas unitarias.
- Playwright para pruebas de interfaz de extremo a extremo.

## Puesta en marcha local

Requisitos: Node.js y npm. El backend debe estar disponible y tener sus migraciones aplicadas.

```bash
npm install
npm start
```

La aplicación queda disponible por defecto en `http://localhost:4200`. La URL de la API se configura en `src/environments/`.

## Scripts

```bash
npm start          # Servidor de desarrollo
npm run build      # Compilación de producción
npm test           # Pruebas unitarias
npm run e2e        # Pruebas Playwright
```

## Estructura

```text
src/app/
├── core/       Autenticación, HTTP, guards y servicios globales
├── shared/     Componentes, modelos y utilidades reutilizables
└── features/   Pantallas organizadas por área funcional
```

Las áreas principales son Inicio, Agenda, Clientes, Productos, Mensajes, Pagos y Ajustes. Los formularios y modales comparten estilos responsive; por debajo de aproximadamente 760 px los modales de trabajo ocupan la pantalla para mantener una interacción cómoda.

## Flujo de pagos

### Yape directo

Yape es la opción disponible actualmente:

1. El usuario activa Yape en **Ajustes → Pagos** y registra el número, el titular y, opcionalmente, una imagen QR.
2. Desde una cita o venta crea la solicitud por el importe correspondiente.
3. El cliente recibe el número, el titular y el QR. El QR es estático, por lo que debe escribir el importe indicado en Yape.
4. El pago permanece `PENDING` hasta que el usuario comprueba el abono en su aplicación de Yape y lo confirma manualmente en TacEtarip.

La interfaz permite copiar las instrucciones, descargar el QR y preparar un mensaje de WhatsApp. WhatsApp recibe el texto; para adjuntar la imagen se debe descargar el QR y agregarlo al mensaje.

Se aceptan imágenes PNG, JPEG o WebP de hasta 700 KB. El backend las almacena temporalmente en PostgreSQL con un límite absoluto de 1 MB; la solución prevista para producción es almacenamiento de objetos, como Amazon S3.

### Culqi

Culqi está previsto como la modalidad automática. La opción se mantiene visible pero deshabilitada hasta implementar credenciales, creación real de órdenes, webhooks firmados e idempotencia. Los enlaces simulados del backend no deben presentarse como pagos reales.

## Agenda y Google Calendar

La Agenda permite crear, reprogramar y cancelar citas, valida fechas futuras y consulta conflictos internos y de Google Calendar. Si una cita sincronizada se modifica o cancela, el cambio se propaga al evento externo. El usuario también puede abrir el calendario externo cuando necesite resolver un conflicto manualmente.

La vinculación OAuth y los webhooks se procesan en el backend; el frontend solo inicia la autorización y muestra el estado de sincronización.

## Pruebas

```bash
npm test -- --run
npm run build
npm run e2e
```

La referencia actual es de 48 pruebas unitarias. Playwright cubre la gestión de citas en viewport de escritorio y móvil: creación, reprogramación y cancelación. Para ejecutar E2E deben estar activos el frontend, el backend y PostgreSQL, con las migraciones aplicadas.

## Configuración para producción

- Configurar la URL HTTPS real de la API en el environment de producción.
- No incluir secretos, credenciales de Google, tokens ni claves de proveedores en el bundle Angular.
- Restringir los orígenes permitidos en el backend.
- Verificar los flujos responsive y E2E antes de desplegar.
- Mantener Culqi deshabilitado hasta completar y validar su integración real.

Consulta el [README principal](../README.md) para la instalación completa del workspace y el [documento de Google](../README-SEGURIDAD-COSTOS-GOOGLE.md) para seguridad, costos y despliegue de esa integración.
