# Bitácora de reconstrucción

## 17 de noviembre de 2026 · Etapa 1

Implementación asistida por ChatGPT/Codex a solicitud de César Urra.

- Se creó una estructura nueva de interfaz, sin copiar el proyecto completo anterior.
- Se implementaron layout, estilos comunes y navegación por hash.
- Se agregó servidor de archivos local en 127.0.0.1:3001, con lista cerrada de recursos.
- Se agregó documentación del reparto entre tres integrantes y alcance real de esta etapa.

Comprobación ejecutada: `npm.cmd run check` aprobó la sintaxis de `server.js` y `public/app.js` el 17 de noviembre de 2026.
Verificación visual por César: **pendiente**. Todavía no se acreditan autenticación, cálculo, CRUD ni integración con módulos del equipo.

Revisión para aprender: `index.html` define las pantallas; `style.css` su aspecto; `app.js` oculta o muestra la sección según la URL; `server.js` sirve esos archivos sin acceder a datos financieros.

## 17 de noviembre de 2026 · Etapa 2

Implementación asistida por ChatGPT/Codex: formulario de acceso, validaciones de entradas, estado de espera, errores, restauración de sesión y cierre confirmado por API. Se creó cliente reutilizable con cookies del mismo origen y CSRF en memoria, además de proxy local de desarrollo al backend.

El contrato de endpoints se documentó para acordarlo con Ignacio. No hay autenticación ficticia ni se atribuye a César desarrollo del backend. Pruebas automatizadas A01–A08 usan respuestas simuladas para validar el cliente; no acreditan integración con backend real ni revisión visual.

Verificación ejecutada: sintaxis de los tres archivos JavaScript aprobada y 8 pruebas del cliente aprobadas, 0 fallidas, con Node.js el 17 de noviembre de 2026. El proxy local y las cookies en navegador siguen pendientes de prueba de integración.

## 17 de noviembre de 2026 · Etapa 3

Implementación asistida por ChatGPT/Codex: listado obtenido de API, filtros por instrumento/mercado/ejercicio, tabla de origen y fecha, estados de carga/vacío/error y reintento. Las respuestas antiguas se descartan al cambiar consulta o salir. La UI inserta los valores como texto, sin interpretar HTML.

Las comprobaciones manuales de acceso reportadas por César se registran separadas en PRUEBAS_MANUALES_CESAR.md, distinguiendo lo visible de lo pendiente. El contrato del listado se agregó a CONTRATO_API.md; sigue pendiente acordarlo y probarlo con el backend reconstruido del equipo.

Comprobación ejecutada: `npm.cmd run check` aprobada y `npm.cmd test` con 14 pruebas aprobadas, 0 fallidas (8 de acceso y 6 de listado). Usan respuestas simuladas; navegador y consulta real del listado pendientes.

## 17 de noviembre de 2026 · Etapa 4

Implementación asistida por ChatGPT/Codex: identificación y 30 pares monto/factor, normalización decimal sin Float, ejemplo HDU, solicitud de cálculo al backend y presentación de resultados. Los factores manuales 34–37 se conservan; la UI muestra suma exacta 8–16 y permite revisar factores. Cambios durante una consulta impiden sobrescribir valores con una respuesta obsoleta.

Se documentaron las nuevas capturas de filtros sin afirmar pruebas con registros existentes. El formulario no guarda todavía: persistencia y edición/eliminación quedan para etapa 5. Revisión de navegador del formulario e integración con el módulo reconstruido siguen pendientes.

Verificación ejecutada: `npm.cmd run check` y `npm.cmd test` aprobadas el 17 de noviembre de 2026, con 22 pruebas y 0 fallos (8 acceso, 6 listado, 8 utilidades del formulario). Estas pruebas no acreditan el montaje DOM ni el cálculo por red en navegador.

## 17 de noviembre de 2026 · Etapa 5

Implementación asistida por ChatGPT/Codex: guardado de nuevas calificaciones, apertura/edición con versión, creación local a partir de referencia Bolsa y eliminación con confirmación. Validación decimal previa, total positivo y suma ≤1, conservación de borrador ante errores/409, bloqueo de envíos duplicados y solicitudes de edición obsoletas. El backend sigue a cargo de permisos, persistencia y auditoría.

Se agregó cliente de operaciones con envío restringido de campos: tenantId/origin no se toman del formulario. Las pruebas del cliente CRUD usan API simulada. El resultado manual del cálculo visible se documentó por separado. El flujo CRUD real de navegador e integración con los módulos reconstruidos del equipo siguen pendientes.

Verificaciones ejecutadas: sintaxis aprobada, 30 pruebas del cliente aprobadas y 0 fallos (8 acceso, 6 listado, 8 formulario, 8 operaciones). Comprobación estructural: 50 IDs HTML únicos, 42 referencias estáticas de app.js sin IDs faltantes y archivos de scripts presentes. Esto no sustituye la ejecución de eventos DOM en navegador.

## 17 de noviembre de 2026 · Verificación guiada de etapa 5

César ejecutó en navegador el recorrido de alta, edición de F34, intento de suma inválida, reapertura, cancelación y confirmación de eliminación. La captura de alta/listado muestra DEMO-CESAR/1 con suma 1; el resto se documentó como confirmación textual del ejecutor, sin inventar capturas ni inspección directa del backend.

El detalle M04–M09 y los pendientes vigentes están en PRUEBAS_MANUALES_CESAR.md. No hubo cambios de código en este registro documental ni se repitieron las pruebas automatizadas. Sigue pendiente la integración con los módulos reconstruidos, auditoría, aislamiento, concurrencia y la revisión visual completa.
