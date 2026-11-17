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

## Cálculo (etapa 4)

POST `/api/calculate`, cookie y X-CSRF-Token. JSON `{ amounts: { "8": "192770580.00000000", ..., "37": "0.00000000" } }`. El cliente transmite strings decimales canónicos, no números Float.

Respuesta propuesta: `{ total: "368745318.00000000", factors: { "8": "0.52277431", ..., "33": "0.00000000" }, warnings: [] }`. Se requieren factores 8–33; los manuales 34–37 que el usuario ingresó no se sobrescriben. El backend define fórmula, redondeo y validación final. La UI suma 8–16 con BigInt únicamente para informar al usuario.

En etapa 4 se calcula y revisa el borrador; no se implementa todavía persistencia por POST /records ni edición/eliminación. Eso pertenece a etapa 5 y al backend de Ignacio.

## Operaciones de escritura (etapa 5)

| Método y ruta | Entrada | Éxito |
| --- | --- | --- |
| GET /api/records/:id | Cookie; registro propio o referencia Bolsa | Registro completo con 30 amounts/factors, tenantId, id y version |
| POST /api/records | JSON instrument, year, market, sequence, paymentDate, registered, amounts, factors | 201; registro persistido con id y version |
| PUT /api/records/:id | Mismos campos + version vigente | 200; registro actualizado y nueva version |
| DELETE /api/records/:id | JSON { version } | 200; { ok: true } |

Escrituras con cookie HttpOnly y X-CSRF-Token. El cliente no decide tenantId/origin, ni reemplaza el control de acceso del servidor. 400 indica validación, 401 sin sesión, 403 sin permiso y 409 llave duplicada o conflicto de versión. Los errores conservan el borrador. No hay reintento automático de escrituras: si la respuesta es incompleta, revisar el listado antes de repetir.

La UI ofrece editar/eliminar solo datos propios. «Usar referencia» carga Bolsa como borrador nuevo; nunca hace PUT a la referencia. La auditoría transaccional es responsabilidad del backend y debe probarse al integrar el módulo del equipo.
