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
