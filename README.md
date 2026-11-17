# Nuam ES3 · Módulo de interfaz de César

Reconstrucción del módulo de interfaz del caso Nuam, Proyecto Integrado TIHI43, Grupo 2.

## Alcance y trabajo del equipo

- César: interfaz web y su integración con el servidor.
- Nibaldo: modelo de datos, persistencia y reglas de cálculo.
- Ignacio: API, sesiones, permisos, CRUD, CSV y auditoría.

Este repositorio nace después de que el docente solicitara reconstruir los módulos con evidencia de desarrollo. No reescribe el historial del proyecto inicial ni presenta el ZIP anterior como desarrollo individual. El desarrollo de este repositorio usa asistencia de ChatGPT/Codex; César debe revisar, probar y comprender cada avance. Confirmar con el docente las condiciones de uso de IA para ES3.

## Etapa actual: 1 — estructura y navegación

Incluye disposición visual, estilos comunes y navegación entre mantenedor, nueva calificación y acceso. Las vistas de acceso y nueva calificación son espacios reservados: todavía no hay autenticación, listado de datos, cálculo ni CRUD. El servidor local solamente sirve archivos; no sustituye el backend de Ignacio.

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

## Etapas siguientes

2. Formulario de acceso y cliente de API.
3. Listado, filtros y estados vacío/carga/error.
4. Formulario de identificación, montos y factores con cálculo en API.
5. Edición, eliminación y manejo de validaciones del servidor.

Cada commit debe describir el avance efectivamente implementado. Cada etapa tendrá sus verificaciones y límites documentados, sin atribuir pruebas aún no realizadas.

## Guía de estilo

Azul #112C3E, verde #B9F068, fondo #F5F7F9, texto #1B3445; tipografía Segoe UI/Arial. Navegación con estado activo, encabezados, tarjetas y foco visible; adaptación CSS a escritorio y pantalla estrecha pendiente de comprobación visual.

## Evidencia

Ver `docs/AVANCES.md`. No hay contraseñas, base de datos ni credenciales en este repositorio.
