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

## Recorrido pendiente de etapa 5

1. Crear DEMO-CESAR, ejercicio 2026, Chile, secuencia 1, fecha válida, No inscrito. Usar montos HDU, calcular y guardar. Esperado: mensaje y registro en tabla, suma 1.
2. Buscar DEMO-CESAR; verificar filtro positivo, mercado y ejercicio; Limpiar debe devolver listado general.
3. Editar F34 a 0,12500000 y guardar. Abrir de nuevo y verificar persistencia de ese factor manual, con suma 8–16 intacta.
4. En edición agregar 0,00000001 a F10 del HDU. Esperado: error de suma mayor que 1 y borrador conservado; ningún guardado exitoso.
5. Eliminar: primero Cancelar debe conservar registro; luego confirmar debe quitarlo del listado. Revisar evento mediante el módulo de auditoría del backend.
6. Confirmar aislamiento con corredor B y conservación de referencia Bolsa. El servidor debe proteger los datos aunque se manipule una petición.
7. Probar una edición desde dos pestañas: guardar en una y luego intentar guardar la versión antigua de la otra. Esperado: 409 con borrador conservado.
8. Repetir revisión visual en escritorio y 1024×768; comprobar teclado, foco, desplazamiento, mensajes y botones.

Registrar por caso fecha, ejecutor, versión, entradas, resultado esperado/obtenido y captura. No marcar estos casos aprobados por el solo hecho de haber implementado sus botones.
