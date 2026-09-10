# ADR-012: La dirección visual es Señalética, con un modo denso

- Estado: aceptada
- Fecha: 2026-09-10

## Contexto

La app no tenía dirección visual. Las pantallas heredaron la paleta de la
landing escrita a mano en cada archivo, y no había un solo `fontFamily` en todo
el proyecto. `standards/design-quality.md` no prescribe tipografía ni paleta a
propósito: dice que eso vive en el sistema del proyecto. No existía.

Se dibujaron tres direcciones sobre el mismo caso real (usuario de diabetes,
glucosa 131 mg/dL, con su ruta y su fuente salidas de `detectarSenales()`):

- **A, Cartilla**: papel cálido, serif para el hallazgo, reglas en vez de
  tarjetas. Parece un documento de salud, no una app.
- **B, Señalética**: bloques de color a sangre, una palabra por pantalla,
  pictogramas sólidos, un solo botón.
- **C, Instrumento**: fondo casi negro, monoespaciada, la curva y el umbral
  dibujados, la regla citada textual.

Las tres están en `docs/design/`: B en la primera página del canvas, A y C
archivadas en la segunda.

## Decisión

**La dirección es B, Señalética.** Las personas para las que se construyó esto
leen la pantalla a pleno sol, con el centro de salud a dos horas, y el jurado la
va a ver a tamaño diminuto en un video de cinco minutos. Las otras dos son mejor
diseño editorial y peor letrero.

Dos reglas gobiernan todo, y están en `mobile/src/ui/tokens.ts`:

1. **Un solo color de señal por pantalla.** Manda el más urgente y los demás
   esperan su turno. El negro no es una señal: es el cierre, el total y el
   estado del envío.
2. **Un solo elemento dominante por pantalla.**

La segunda es la que obliga al **modo denso**, que es la parte no obvia de esta
decisión. Señalética sola no sobrevive a una lista larga, y el paquete de
`ADR-010` son diez líneas. Cuando hay lista: el bloque de veredicto se encoge a
barra, el cuerpo baja a 13 px, y el total en negro toma el relevo como elemento
dominante. Lo que se conserva no es el tamaño de la letra, es que siempre haya
una cosa que mande.

Pisos que no se bajan: **13 px** de cuerpo y **48 px** de alto en cualquier cosa
que se toque.

La urgencia se dice como la diría un letrero, no como la nombra el código:
`Prioritaria` sale en pantalla como "anda pronto".

## Lo que se descartó, y por qué

- **A, Cartilla.** El tono institucional hace creíble una alerta médica y aguanta
  mejor las pantallas densas. Pierde a tamaño de video, que es donde se juega el
  reto General.
- **C, Instrumento.** Cuenta la historia técnica mejor que ninguna, y la tira de
  rendimiento del modelo es material directo para Tether Psy. Pero una pantalla
  oscura rinde peor al mediodía y el registro intimida a quien no es técnico. Esa
  tira sigue siendo buena idea y todavía no tiene sitio en Señalética.
- **Archivo Black**, la tipografía con la que se dibujó. Obliga a instalar
  `expo-font`, que es módulo nativo, y a otro prebuild. El bloque 0 se acababa de
  cerrar en el 17 Pro Max (`48a73a0`) y Android quedó parqueado tras el abort de
  Bare: justo después de que un build frágil arranca no se le mete una
  dependencia. Se usa el peso 900 del sistema (SF Pro Black en iOS, Roboto Black
  en Android) y el cambio está detrás de la constante `DISPLAY`, con los cuatro
  pasos escritos ahí.
- **`react-native-svg`** para los pictogramas, por lo mismo. Se dibujan con
  `View`: la señalética real es geometría elemental y a 30 px no da para más.

## Consecuencias

- El sistema vive en `mobile/src/ui/`: `tokens.ts`, `componentes.tsx`,
  `Pictograma.tsx`. Ninguna pantalla define estilos propios de color o tipografía.
- **Cero hex sueltos fuera de `ui/`.** Si hace falta un color que no está, se
  añade al token, no al archivo de la pantalla. Ya pasó una vez: tres pantallas
  habían inventado el mismo gris por su cuenta.
- Toda pantalla nueva se arma con las piezas existentes. Si algo se repite en
  dos, sube a `componentes.tsx`.
- `docs/design/Sistema.dc.html` es la hoja visual del sistema y tiene que seguir
  al código, no al revés. El código manda.

## Reabrir si

- La prueba en mano, a pleno sol, muestra que el bloque de color a sangre no se
  lee o que el cuerpo de 13 px del modo denso no se alcanza a leer.
- El video grabado muestra que la pantalla no se entiende a tamaño reducido, que
  es justo lo que esta dirección venía a resolver.
- Aparece una pantalla que el modo denso no aguanta. Sería señal de que la regla
  del elemento dominante no basta y hace falta un tercer modo.

Ninguna de las tres se cierra con opinión: se cierran mirando el teléfono o el
video.
