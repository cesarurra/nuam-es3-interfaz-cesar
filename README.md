# Nuam ES3 · Mantenedor de calificaciones tributarias

Integración de la interfaz, la API y el módulo de cálculo y datos del caso Nuam, Proyecto Integrado TIHI43, Grupo 2.

## Alcance y trabajo del equipo

- César: interfaz web y su integración con el servidor.
- Nibaldo: modelo de datos, persistencia y reglas de cálculo.
- Ignacio: API, sesiones, permisos, CRUD, CSV y auditoría.

Este repositorio nace después de que el docente solicitara reconstruir los módulos con evidencia de desarrollo. No reescribe el historial del proyecto inicial ni presenta el ZIP anterior como desarrollo individual. El desarrollo de este repositorio usa asistencia de ChatGPT/Codex; César debe revisar, probar y comprender cada avance. Confirmar con el docente las condiciones de uso de IA para ES3.

## Etapas implementadas: 1 a 5

Incluye disposición visual, navegación, acceso y cliente de API, listado/filtros y formulario de montos/factores 8–37 con cálculo recibido del servidor. Permite crear, editar y eliminar mediante API, conservar el borrador ante validaciones/conflictos y crear una versión local desde referencia Bolsa. Autenticación, consulta, cálculo, persistencia y auditoría requieren backend; no se simulan sesiones ni guardados en la aplicación. Se incluye un botón para cargar montos de ejemplo del HDU, identificado como tal.

`server.js` sirve la interfaz y reenvía `/api/*` a la API local de Ignacio. La API invoca el cálculo decimal y el almacenamiento de Nibaldo a través de un adaptador. El modo de demostración guarda calificaciones y eventos en un archivo JSON local.

## Ejecutar

Requisito: Node.js 22 o posterior. Sin dependencias externas. Abrir dos terminales en la raíz de la rama de integración.

En la primera, iniciar la API:

```powershell
npm.cmd run start:api
```

En la segunda, iniciar la interfaz:

```powershell
npm.cmd start
```

Abrir `http://127.0.0.1:3001/#acceso`. La API escucha en 3000 y la interfaz en 3001. Las cuentas locales de demostración se encuentran en `buildSeedData` de [src/store.js](src/store.js). Ctrl+C detiene cada servidor. Si se reinicia la API, recargar la página e iniciar sesión de nuevo.

Los datos quedan en `data/nuam-demo.json`, excluido de Git. Para aislar pruebas, establecer `NUAM_DATA_FILE` antes de iniciar la API. Usar una sola instancia de la API por archivo. Para cambiar el puerto, definir `API_PORT` en la terminal de la API y el `API_ORIGIN` correspondiente en la terminal de la interfaz.

```powershell
npm.cmd run check
```

La comprobación revisa sintaxis JavaScript. No acredita pruebas de navegador ni de API.

```powershell
npm.cmd test
```

Ejecuta las pruebas del cliente y la API, incluida la recarga del archivo local. El recorrido de Chrome se documenta en [el registro de verificación](docs/PRUEBAS_MANUALES_CESAR.md).

## Historial de desarrollo

1. Estructura y navegación: 4fd574b.
2. Acceso y cliente de API: d90c510.
3. Listado/filtros y estados: f3a3f7c.
4. Identificación, montos y cálculo: 615c67f.
5. Guardado, edición y eliminación: commit de cierre de esta etapa.

Cada commit debe describir el avance efectivamente implementado. Cada etapa tendrá sus verificaciones y límites documentados, sin atribuir pruebas aún no realizadas.

## Guía de estilo

Azul #112C3E, verde #B9F068, fondo #F5F7F9, texto #1B3445; tipografía Segoe UI/Arial. Navegación con estado activo, encabezados, tarjetas y foco visible. El formulario se comprobó en escritorio y pantalla estrecha.

## Evidencia

Ver `docs/AVANCES.md`. No hay contraseñas, base de datos ni credenciales en este repositorio.

## Qué falta para la entrega

- El recorrido CRUD básico de etapa 5 fue ejecutado por César contra el backend del prototipo anterior; alta tiene captura y edición/validación/eliminación tienen confirmaciones textuales. Completar las capturas y verificaciones detalladas en docs/PRUEBAS_MANUALES_CESAR.md.
- Confirmar con el equipo el motor que se presentará. El modo local usa JSON y mantiene los datos tras reiniciar. El adaptador Firestore requiere configuración y verificación aparte.
- Completar la revisión de accesibilidad y confirmar con el docente si CSV y log entran en la demostración. La API expone ambos, y el flujo de navegador verificado cubre operaciones manuales, con auditoría consultada por API.
- Confirmar que el docente tiene acceso a GitHub y revisar en equipo la evidencia y las contribuciones antes de entregar.

## Aportes e integración

- César: interfaz, navegación, consumo de la API y pruebas guiadas de interfaz. [Historial de la interfaz](https://github.com/cesarurra/nuam-es3-interfaz-cesar/commits/1ef3418).
- Ignacio: servidor, autenticación, permisos, operaciones, CSV, auditoría y adaptador Firestore. [Rama de Ignacio](https://github.com/cesarurra/nuam-es3-interfaz-cesar/commits/ignacio/backend/).
- Nibaldo: dominio, reglas tributarias, cálculo decimal y almacén transaccional en memoria. [Rama de Nibaldo](https://github.com/cesarurra/nuam-es3-interfaz-cesar/commits/nibaldo/datos/).
- Codex: correcciones de interfaz, adaptación de los módulos y persistencia local de demostración, además de las pruebas automatizadas documentadas. Los historiales originales se conservan en la rama de integración.
