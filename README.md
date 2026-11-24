# Mantenedor de Calificaciones Tributarias para corredores de Nuam

Proyecto Integrado (TIHI43), ES3.

- **Grupo:** 2
- **Integrantes:** César Andrés Urra Zambrano, Nibaldo Zepeda, Ignacio Rivera

## Qué hace

La aplicación permite a corredores consultar y filtrar calificaciones tributarias, ingresar montos y factores, solicitar su cálculo y gestionar registros.
El flujo contempla iniciar sesión, revisar el listado, completar o editar una calificación y guardarla mediante la API del equipo.
La interfaz requiere un backend compatible para autenticación, cálculo y operaciones de datos; este repositorio no incluye una API ejecutable integrada.

## Requisitos

- **Sistema operativo:** Windows, macOS o Linux compatible con Node.js.
- **Lenguaje y versión:** Node.js 22 o posterior.
- **Base de datos:** No se requiere para ejecutar la interfaz. El módulo `src/store.js` es una tienda en memoria de desarrollo, no está conectado a una API y no conserva datos al reiniciar.
- **Otras herramientas:** Git y un navegador moderno. Para el flujo completo se necesita además un backend local compatible con el contrato descrito en [`docs/CONTRATO_API.md`](./docs/CONTRATO_API.md).

## Instalación paso a paso

1. Clonar el repositorio:

   ```sh
   git clone https://github.com/cesarurra/nuam-es3-interfaz-cesar.git
   ```

2. Entrar a la carpeta:

   ```sh
   cd nuam-es3-interfaz-cesar
   ```

3. Verificar Node.js:

   ```sh
   node --version
   ```

   Debe ser la versión 22 o posterior. No es necesario instalar paquetes: el proyecto usa módulos integrados de Node.js.

4. Crear una base de datos: no aplica a esta interfaz. La API y su almacenamiento deben configurarse por separado en el backend.

5. Configurar variables: no se necesita un archivo `.env`. Por defecto, la interfaz usa el puerto `3001` y reenvía las solicitudes `/api/*` a `http://127.0.0.1:3000`. Si el backend usa otro puerto, configura `API_ORIGIN` antes de iniciar la interfaz:

   ```powershell
   $env:API_ORIGIN = "http://127.0.0.1:PUERTO"
   ```

   En macOS o Linux:

   ```sh
   export API_ORIGIN=http://127.0.0.1:PUERTO
   ```

   Reemplaza `PUERTO` por el puerto local del backend. No guardes contraseñas ni llaves reales en el repositorio.

6. Cargar datos de ejemplo: no hay una base de datos ni un comando de carga en este repositorio. El botón **Usar montos HDU** rellena montos de ejemplo en el formulario; no crea ni guarda registros.

## Cómo ejecutar

Inicia primero el backend compatible y luego, desde la raíz del repositorio, ejecuta:

```sh
npm start
```

Abre [http://127.0.0.1:3001](http://127.0.0.1:3001). Sin backend, la interfaz se sirve, pero las funciones que dependen de la API mostrarán un error de disponibilidad. No hay usuario ni contraseña de demostración incluidos en este repositorio.

## Cómo ejecutar las pruebas

```sh
npm test
npm run check
```

`npm test` ejecuta pruebas del cliente con respuestas simuladas; no acredita una integración completa con el backend ni pruebas de navegador. `npm run check` revisa la sintaxis de JavaScript. Los resultados y límites de verificación están en [`docs/AVANCES.md`](./docs/AVANCES.md); los resultados manuales y pendientes, en [`docs/PRUEBAS_MANUALES_CESAR.md`](./docs/PRUEBAS_MANUALES_CESAR.md).

## Estructura del repositorio

- `public/`: interfaz web, estilos y clientes de API.
- `server.js`: servidor local de archivos y proxy de desarrollo para `/api/*`.
- `src/`: reglas de dominio y almacenamiento en memoria para desarrollo.
- `tests/`: pruebas automatizadas de los clientes de la interfaz.
- `docs/`: contrato propuesto de API, bitácora y evidencias/pendientes de pruebas manuales.

## Decisiones del caso

- **Suma de factores:** se valida sobre las columnas 8–16; el total usado como denominador del cálculo suma los montos de las columnas 8–19.
- **Filas inválidas en un CSV:** no aplica; la importación CSV no está implementada en este repositorio.
- **Llave de una calificación:** `tenantId`, ejercicio, mercado, instrumento y secuencia.
- **Factores 34–37:** se ingresan manualmente y no se calculan con la fórmula de las columnas 8–33.

## Problemas frecuentes

- **“El servidor de autenticación no está disponible”:** inicia el backend compatible en `127.0.0.1:3000` o configura `API_ORIGIN` con su puerto local antes de ejecutar `npm start`.
- **Error por versión de Node.js:** instala Node.js 22 o posterior y vuelve a ejecutar el comando.
- **No puedo iniciar sesión o guardar:** este repositorio no incluye credenciales de demostración ni la API integrada; verifica que el backend esté disponible y que implemente el contrato documentado. La integración con los módulos reconstruidos del equipo aún debe verificarse.

## Equipo

Reparto de trabajo declarado: César Andrés Urra Zambrano, interfaz; Nibaldo Zepeda, reglas de cálculo y almacenamiento de desarrollo; Ignacio Rivera, API y funcionalidades de backend asignadas. Consulta el [historial de commits de la rama](https://github.com/cesarurra/nuam-es3-interfaz-cesar/commits/nibaldo/datos/) para ver los avances registrados.
