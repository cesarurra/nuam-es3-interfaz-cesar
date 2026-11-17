# Pruebas manuales de César · 17 de noviembre de 2026

Entorno observado: navegador integrado de ChatGPT en Windows, interfaz en 127.0.0.1:3001. Backend utilizado: prototipo anterior en 3000; no se acredita el backend reconstruido por Ignacio. Versión de interfaz observada: etapa 2, commit d90c510.

| Caso | Entrada / acción | Esperado | Resultado disponible | Estado |
| --- | --- | --- | --- | --- |
| M01 Restauración de sesión | Abrir #acceso con sesión existente | Usuario visible sin formulario | Captura muestra Corredor A y botón Salir; servidor disponible | Coincide en la captura |
| M02 Credencial incorrecta | Cuenta cesar@demo.local y contraseña incorrecta, después de solicitar salir | Rechazo y permanencia sin sesión | César informó «correo o contraseña incorrectas». No se adjuntó captura del estado completo | Mensaje confirmado por reporte; falta evidencia de permanencia sin sesión |
| M03 Acceso correcto | Ingreso con contraseña correcta según secuencia guiada | Ir a #calificaciones y mostrar Corredor A | Captura posterior muestra #calificaciones, Corredor A y Salir | Coincide en la captura |

Capturas recibidas en la conversación. Guardar copias recortadas de la aplicación en docs/evidencias y referenciarlas aquí antes de entregar. No incluir contraseñas ni partes ajenas de la conversación.

No se acreditan todavía listado, filtros, creación, cálculo, edición, eliminación ni inspección de cookies. La etapa 3 se incorpora después de estas capturas y requiere su propia prueba manual.
