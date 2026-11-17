# Nuam ES3 · Módulo de interfaz de César

Reconstrucción del módulo de interfaz del caso Nuam, Proyecto Integrado TIHI43, Grupo 2.

## Alcance y trabajo del equipo

- César: interfaz web y su integración con el servidor.
- Nibaldo: modelo de datos, persistencia y reglas de cálculo.
- Ignacio: API, sesiones, permisos, CRUD, CSV y auditoría.

Este repositorio nace después de que el docente solicitara reconstruir los módulos con evidencia de desarrollo. No reescribe el historial del proyecto inicial ni presenta el ZIP anterior como desarrollo individual. El desarrollo de este repositorio usa asistencia de ChatGPT/Codex; César debe revisar, probar y comprender cada avance. Confirmar con el docente las condiciones de uso de IA para ES3.

## Etapas implementadas: 1 a 5

Incluye disposición visual, navegación, acceso y cliente de API, listado/filtros y formulario de montos/factores 8–37 con cálculo recibido del servidor. Permite crear, editar y eliminar mediante API, conservar el borrador ante validaciones/conflictos y crear una versión local desde referencia Bolsa. Autenticación, consulta, cálculo, persistencia y auditoría requieren backend; no se simulan sesiones ni guardados en la aplicación. Se incluye un botón para cargar montos de ejemplo del HDU, identificado como tal.

`server.js` sirve la interfaz y reenvía `/api/*` al backend local en puerto 3000. No reconstruye las operaciones del backend. Ver `docs/CONTRATO_API.md`; sin backend el formulario muestra un error de disponibilidad.

## Ejecutar

Requisito: Node.js 22 o posterior. Sin dependencias externas.

```powershell
npm.cmd start
```

Abrir http://127.0.0.1:3001. Se usa 3001 para no confundirlo con el prototipo anterior en 3000. Ctrl+C detiene el servidor.

```powershell
npm.cmd run check
```

La comprobación revisa sintaxis JavaScript. No acredita pruebas de navegador ni de API.

```powershell
npm.cmd test
```

Ejecuta pruebas del cliente con respuestas simuladas: validación, errores, sesión/CSRF, listado, formulario y operaciones CRUD. No acreditan el flujo completo en navegador. Ver docs/PRUEBAS_MANUALES_CESAR.md para evidencias recibidas y casos pendientes.

## Historial de desarrollo

1. Estructura y navegación: 4fd574b.
2. Acceso y cliente de API: d90c510.
3. Listado/filtros y estados: f3a3f7c.
4. Identificación, montos y cálculo: 615c67f.
5. Guardado, edición y eliminación: commit de cierre de esta etapa.

Cada commit debe describir el avance efectivamente implementado. Cada etapa tendrá sus verificaciones y límites documentados, sin atribuir pruebas aún no realizadas.

## Guía de estilo

Azul #112C3E, verde #B9F068, fondo #F5F7F9, texto #1B3445; tipografía Segoe UI/Arial. Navegación con estado activo, encabezados, tarjetas y foco visible; adaptación CSS a escritorio y pantalla estrecha pendiente de comprobación visual.

## Evidencia

Ver `docs/AVANCES.md`. No hay contraseñas, base de datos ni credenciales en este repositorio.

## Qué falta para la entrega

- El recorrido CRUD básico de etapa 5 fue ejecutado por César contra el backend del prototipo anterior; alta tiene captura y edición/validación/eliminación tienen confirmaciones textuales. Completar las capturas y verificaciones detalladas en docs/PRUEBAS_MANUALES_CESAR.md.
- Probar filtros con datos existentes, cambios manuales de factores, conflictos y aislamiento entre usuarios.
- Probar el contrato contra los módulos reconstruidos de Ignacio y Nibaldo. Las capturas recibidas hasta etapa 4 usaron el backend del prototipo inicial; no acreditan el trabajo reconstruido del equipo.
- Completar revisión responsive, teclado/foco y documentación de pruebas.
- Confirmar invitación aceptada por el docente, condiciones de uso de IA, motor de datos y repositorio de integración. Esta interfaz no incluye base de datos ni importación CSV/auditoría, que corresponden a los módulos del equipo.
