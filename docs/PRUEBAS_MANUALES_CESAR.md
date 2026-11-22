# Pruebas manuales de César · 17 de noviembre de 2026

Entorno observado: navegador integrado de ChatGPT en Windows, interfaz en 127.0.0.1:3001. Backend utilizado: prototipo anterior en 3000; no se acredita el backend reconstruido por Ignacio. Versión de interfaz observada: etapa 2, commit d90c510.

| Caso | Entrada / acción | Esperado | Resultado disponible | Estado |
| --- | --- | --- | --- | --- |
| M01 Restauración de sesión | Abrir #acceso con sesión existente | Usuario visible sin formulario | Captura muestra Corredor A y botón Salir; servidor disponible | Coincide en la captura |
| M02 Credencial incorrecta | Cuenta cesar@demo.local y contraseña incorrecta, después de solicitar salir | Rechazo y permanencia sin sesión | César informó «correo o contraseña incorrectas». No se adjuntó captura del estado completo | Mensaje confirmado por reporte; falta evidencia de permanencia sin sesión |
| M03 Acceso correcto | Ingreso con contraseña correcta según secuencia guiada | Ir a #calificaciones y mostrar Corredor A | Captura posterior muestra #calificaciones, Corredor A y Salir | Coincide en la captura |

Capturas recibidas en la conversación. Guardar copias recortadas de la aplicación en docs/evidencias y referenciarlas aquí antes de entregar. No incluir contraseñas ni partes ajenas de la conversación.

No se acreditan todavía listado, filtros, creación, cálculo, edición, eliminación ni inspección de cookies. La etapa 3 se incorpora después de estas capturas y requiere su propia prueba manual.

## Evidencia posterior de etapa 3 (commit f3a3f7c)

- La captura del mantenedor muestra los tres filtros, botones Buscar/Limpiar y el mensaje de resultado vacío.
- Después de indicar buscar NO-EXISTE-123, César informó el mismo mensaje de ningún resultado. Se confirma el texto reportado; no se inspeccionó la petición HTTP.
- Después de solicitar Limpiar, la captura muestra Instrumento vacío, Mercado Todos y el ejemplo gris 2026 en Ejercicio, coherente con el placeholder del HTML. La persistencia del estado vacío no demuestra filtros sobre registros existentes.
- Sigue pendiente probar búsquedas con datos existentes y combinaciones de mercado/ejercicio. El formulario de etapa 4 se incorpora después de estas capturas.

## Evidencia posterior de etapa 4 (commit 615c67f)

La captura del formulario después de Usar montos HDU y Calcular factores muestra total montos 8–19 = 368745318,00000000 y suma factores 8–16 = 1,00000000, coincidentes con el caso esperado. Se ven las filas 32–37 y factores manuales 34–37 en cero. F8 no está visible: falta captura/verificación del valor 0,52277431. La pantalla declara correctamente que no hay registro guardado.

Se acredita el resultado visible del cálculo contra el backend del prototipo anterior. No se acredita aún el módulo reconstruido de Nibaldo ni de Ignacio, ni persistencia desde esta interfaz.

## Plan de pruebas de etapa 5

1. Crear DEMO-CESAR, ejercicio 2026, Chile, secuencia 1, fecha válida, No inscrito. Usar montos HDU, calcular y guardar. Esperado: mensaje y registro en tabla, suma 1.
2. Buscar DEMO-CESAR; verificar filtro positivo, mercado y ejercicio; Limpiar debe devolver listado general.
3. Editar F34 a 0,12500000 y guardar. Abrir de nuevo y verificar persistencia de ese factor manual, con suma 8–16 intacta.
4. En edición agregar 0,00000001 a F10 del HDU. Esperado: error de suma mayor que 1 y borrador conservado; ningún guardado exitoso.
5. Eliminar: primero Cancelar debe conservar registro; luego confirmar debe quitarlo del listado. Revisar evento mediante el módulo de auditoría del backend.
6. Confirmar aislamiento con corredor B y conservación de referencia Bolsa. El servidor debe proteger los datos aunque se manipule una petición.
7. Probar una edición desde dos pestañas: guardar en una y luego intentar guardar la versión antigua de la otra. Esperado: 409 con borrador conservado.
8. Repetir revisión visual en escritorio y 1024×768; comprobar teclado, foco, desplazamiento, mensajes y botones.

Registrar por caso fecha, ejecutor, versión, entradas, resultado esperado/obtenido y captura. No marcar estos casos aprobados por el solo hecho de haber implementado sus botones.

## Resultados de etapa 5 informados por César

Fecha: 17 de noviembre de 2026. Versión: 36fc60e. Ejecutor de las acciones de navegador: César Urra; documentación asistida por ChatGPT/Codex. Se utilizó la interfaz reconstruida en 3001 y el backend del prototipo anterior en 3000.

| Caso | Entrada / acción | Resultado esperado | Resultado obtenido y evidencia | Evaluación |
| --- | --- | --- | --- | --- |
| M04 Alta y consulta | Crear DEMO-CESAR/1 con montos HDU y guardar | Registro visible, ejercicio 2026, Chile y suma 1 | Captura muestra DEMO-CESAR/1, 2026, Chile, Corredor/Manual, suma 1,00000000 y un registro encontrado | Coincide en la captura; estado No inscrito no visible en esa evidencia |
| M05 Edición de factor manual | Cambiar F34 a 0,12500000, guardar y reabrir | F34 conserva 0.12500000 | César confirmó por texto que el valor seguía al reabrir | Coincide según reporte del ejecutor; falta captura |
| M06 Suma inválida | Cambiar F10 de cero a 0.00000001 sobre el ejemplo y solicitar guardar | Bloqueo porque suma 8–16 supera 1 | César transcribió: «La suma de factores 8–16 supera 1. Corrige los valores antes de guardar» | Coincide según reporte; validación del cliente, no prueba de rechazo directo de API |
| M07 Conservación de datos guardados | Volver al listado tras el rechazo y reabrir | F10=0.00000000 y F34=0.12500000 | César confirmó ambos valores en la secuencia guiada | Coincide según reporte; falta captura |
| M08 Cancelación de eliminación | Eliminar y después Cancelar | Registro permanece | César confirmó que cancelar conserva el registro | Coincide según reporte; falta captura |
| M09 Eliminación confirmada | Repetir Eliminar y confirmar | Registro desaparece del listado | César confirmó la eliminación en la secuencia guiada | Coincide según reporte; falta captura y comprobación del evento de auditoría |

No se reportaron diferencias respecto a lo esperado en estos seis casos. El alcance de evidencia es el indicado por fila: las confirmaciones por texto no se presentan como capturas inspeccionadas. No se inspeccionó la base ni se verificó auditoría mediante estas acciones.

## Pendientes vigentes después de esta sesión

- Guardar y enlazar capturas reales recortadas para M05–M09 y para el acceso incorrecto completo; la conversación no reemplaza los archivos de evidencia del repositorio.
- Comprobar F8=0.52277431, la condición No inscrito, filtros positivos por instrumento/mercado/ejercicio y persistencia después de reiniciar.
- Revisar auditoría de ingreso, modificación y eliminación en el backend, aislamiento con corredor B, referencia Bolsa y conflicto de versión con dos pestañas.
- Revisar tamaño 1024×768, teclado, foco y desplazamientos, especialmente la tabla de 30 factores y las acciones a la derecha del listado.
- Repetir integración contra los módulos reconstruidos de Ignacio y Nibaldo; las verificaciones presentes usan el backend del prototipo inicial.

## Verificación automatizada en navegador · 22 de noviembre de 2026

Ejecutor: Codex. Windows, Node.js 24.18.0, Chrome automatizado con Playwright. Interfaz de esta rama sobre `1ef3418`, con proxy local hacia `ignacio/backend` en `3f9a488`. Se ejecutó `createApp({ storage: 'memory' })` con las cuentas y datos de demostración de Ignacio. Sin Firestore ni datos externos.

| Caso ejecutado | Esperado | Observado |
| --- | --- | --- |
| Acceso, recarga y salida | Rechazar credenciales incorrectas; restaurar una sesión válida al recargar; invalidarla al salir | Login 401 y 200, cookie HttpOnly, listado visible tras recargar, logout 200 y /me 401 |
| Filtrado y alcance | Instrumento, mercado y ejercicio devuelven el registro de prueba; excluir la fila sembrada del otro corredor; ofrecer solo «Usar referencia» para Bolsa | Filtro combinado devuelve solo QA-CODEX; no aparece OTRO-CORREDOR para A; referencia con acción de copia y sin eliminación |
| HDU, alta y edición | Total 368745318.00000000, F8 0.52277431, suma 1; conservar No inscrito y F34 manual | Cálculo 200 con esos valores; alta 201; edición 200; «No inscrito» al abrir y F34 0.12500000 al reabrir |
| Conflicto y validación | Rechazar la versión anterior sin perder el borrador; bloquear suma mayor que 1 | Segunda pestaña guardó primero; primera recibió 409 y conservó F34 0.37500000. F10 0.00000001 activó el mensaje de suma superior a 1 y quedó visible |
| Eliminación y auditoría | Escape conserva fila; confirmar quita fila y quedan eventos de CRUD | Fila visible tras Escape; DELETE 200 y fila retirada; /api/audit devolvió eventos LOGIN, RECORD_CREATE, RECORD_UPDATE y RECORD_DELETE |
| Teclado y diseño adaptable | Saltar al contenido sin cambiar pantalla; mover foco al editar; desplazar tabla angosta con teclado | En #acceso, Tab y Enter enfocaron el contenido y conservaron la pantalla; al editar se enfocó el título. A 390 px, Tab enfocó la tabla y Flecha derecha la desplazó. El formulario no desbordó el documento a 1440×900, 1024×768, 390×844 ni 320×640 |

[Captura de Chrome a 390×844](evidencias/formulario-390.png), con datos de prueba. Las comprobaciones de teclado cubren los casos de la tabla y no constituyen una auditoría completa de accesibilidad.

Antes de las correcciones, Chrome reprodujo el cambio de pantalla al accionar «Saltar al contenido» y la falta de la acción de edición en el listado de Ignacio. La API resumida no incluye `tenantId` ni `version`. La interfaz usa el origen del resumen para mostrar las acciones y comprueba titularidad y versión con el detalle antes de confirmar el borrado. El servidor sigue autorizando las escrituras.

- En la interfaz se ejecutaron `npm run check` y `npm test`: sintaxis correcta, 31 pruebas aprobadas. En la rama de Ignacio se ejecutó `node --test tests/*.test.mjs`: 5 aprobadas.
- En `nibaldo/datos` (`abab267`) se verificaron aisladamente el total HDU, F8, F34 manual, suma exacta, rechazo de total cero y almacenamiento en memoria por instancia. La API de Ignacio calcula con su propia función y usa un contrato de almacenamiento diferente. Quedan pendientes conectar el cálculo y la capa de datos de Nibaldo, configurar el motor acordado y verificar persistencia tras reinicio, auditoría transaccional y el alcance de CSV.
- Correcciones, automatización y documentación elaboradas con asistencia de Codex. El recorrido de esta sección fue automatizado y se registra aparte de las acciones anteriores ejecutadas por César.
