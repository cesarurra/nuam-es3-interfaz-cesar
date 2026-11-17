# Contrato de integración: acceso

Propuesta basada en la API del prototipo inicial. Confirmar con Ignacio antes de integrar su reconstrucción. No equivale a una API ya reconstruida ni probada en conjunto.

| Método y ruta | Entrada | Respuesta de éxito |
| --- | --- | --- |
| GET /api/status | Sin sesión | { setupRequired: boolean, storage: string } |
| POST /api/login | JSON { email, password } | { user: { name, id, role, tenantId }, csrf }; cookie HttpOnly del servidor |
| GET /api/me | Cookie del servidor | { user, csrf } |
| POST /api/logout | Cookie y X-CSRF-Token | { ok: true }; servidor invalida la sesión |

Errores: estado HTTP no exitoso y JSON `{ error: "Mensaje legible" }`. El cliente no guarda contraseñas, cookies manuales ni tokens en localStorage. El CSRF permanece solamente en memoria. No se guardan usuarios ficticios para simular autenticación.

La interfaz se sirve en 127.0.0.1:3001. El servidor de desarrollo reenvía /api/* al backend local en 127.0.0.1:3000 mediante proxy. Configurar otro puerto de backend con `$env:API_ORIGIN="http://127.0.0.1:PUERTO"` antes de ejecutar npm start. Este proxy es de desarrollo local, no un despliegue de producción ni el backend de Ignacio.

Sin backend, el acceso debe mostrar indisponibilidad. No marcar login/logout como integración aprobada hasta probarlos contra el módulo del equipo.

## Consulta de calificaciones (etapa 3)

GET `/api/records?q=INSTRUMENTO&market=Chile&year=2026`, con cookie. Parámetros opcionales: q, market (Chile/Perú/Colombia) y year (2000–2099). El servidor filtra por tenant derivado de la sesión; el navegador no envía ni decide tenantId.

Respuesta: array de registros con id, instrument, sequence, year (string), market, origin, source, sum (string decimal canónico de 8 decimales) y updatedAt (fecha ISO). Array vacío es un resultado válido; 401 es sesión ausente/vencida. Una respuesta mal formada muestra error, no se interpreta como ausencia de datos.
