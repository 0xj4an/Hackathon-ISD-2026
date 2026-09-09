# ADR-004: `core/` se mueve dentro de `mobile/src/`, sin monorepo

- Estado: aceptada
- Fecha: 2026-09-09
- Contexto: `core/` es un paquete hermano (`@app/core`) con los schemas zod, los
  prompts, las reglas y las validaciones. `mobile/` lo necesita entero y `nodo/`
  necesita una parte. Metro, el bundler de React Native, **no resuelve un paquete
  hermano fuera de su raíz** sin configurar workspaces y `watchFolders`. Además
  `core/` hoy ni siquiera tiene `node_modules` instalado.

## Decisión

Mover `core/*.ts` a `mobile/src/core/`. `nodo/` duplica lo poco que necesita, o
importa los `.ts` compilados. No se configura monorepo.

## Alternativas consideradas

- **npm workspaces en la raíz + `metro.config.js` con `watchFolders`.** Es la
  solución correcta y la que haríamos en un proyecto normal. Cuesta cerca de una
  hora de pelea con Metro, con riesgo de errores de resolución que solo aparecen
  al compilar en el dispositivo. Con 41 horas en el reloj, es un gasto malo.
- **Publicar `core/` a un registro.** Absurdo para 48 horas.
- **Symlink de `core/` dentro de `mobile/`.** Metro sigue el symlink de forma
  inconsistente entre versiones. Cambia un problema conocido por uno raro.

## Consecuencias

- Duplicación real de código entre `mobile/src/core/` y `nodo/`. Es deuda
  asumida a conciencia, no un descuido.
- El punto de duplicación es pequeño: `nodo/credito.mjs` ya es independiente y
  no importa nada de `core/`. En la práctica lo único compartido de verdad son
  los schemas, y el nodo puede validar con los suyos.
- **Riesgo de deriva de schemas.** `SolicitudSchema` y `RespuestaBancoSchema` son
  el contrato entre teléfono y nodo. Si se tocan de un lado y no del otro, el
  flujo se rompe en la demo. Mitigación: son de Artur, y cualquier cambio se
  avisa antes de tocarlo.
- Va declarado en el README como decisión de presupuesto de tiempo. Es
  defendible ante un jurado; esconderla no lo sería.

## Reabrir si

Aparece un tercer consumidor de `core/`, o la deriva de schemas causa un fallo
real en la demo. En cualquiera de los dos casos, el monorepo deja de ser un gasto
y pasa a ser la solución.
