# Datasets de usuarios demo · historial clínico de un año

**Fecha:** 2026-09-10  
**Estado:** aprobado (enfoque A)  
**Alcance:** los 6 usuarios existentes en `data/usuarios/`, sin población masiva

## Objetivo

Cada caso de demo lleva un historial sintético de **~365 días** con densidades
creíbles por variable (como mediría alguien en la vida real), no series cortas
de ~65 puntos. Las `senales_esperadas` no cambian: `eval/run.mjs` sigue siendo
la prueba de contrato.

## Decisiones

1. **Solo los 6 usuarios** (`sano`, `diabetes`, `hipertension`, `respiratorio`,
   `hipoglucemia`, `prediabetes`). Misma narrativa y mismos correos de entrada.
2. **Densidad clínica (enfoque A):** frecuencia por variable y por caso. No
   diario uniforme. Agudos = baseline anual normal + episodio reciente.
3. **Semilla fija** en `data/generar-usuarios.mjs`: reproducible.
4. **Salida dual:** escribe `data/usuarios/` y copia a `mobile/src/datos/` para Metro.
5. **Contrato de señales intacto:** cada JSON declara las mismas
   `senales_esperadas`; el generador garantiza que `detectarSenales()` las produce.

## Densidades por caso (orden de magnitud)

| Caso | Arco | Glucosa | Presión | Pulso | Vitals resp./temp/sat | Peso |
| --- | --- | --- | --- | --- | --- | --- |
| sano | estable 12 m | ~mensual | ~quincenal | ~semanal | ~mensual | ~quincenal |
| diabetes | deterioro 12 m | ~2×/sem | ~semanal | ~semanal | ~mensual | ~semanal, baja >5% |
| hipertension | sostenida 12 m | ~mensual | ~2×/sem | ~semanal | ~mensual | ~quincenal |
| respiratorio | sano 11.5 m + agudo ~5 d | ~mensual | ~quincenal | semanal → diario en agudo | densos en agudo | ~mensual |
| hipoglucemia | control 12 m + pico bajo reciente | ~2×/sem | ~quincenal | ~semanal | ~mensual | ~quincenal |
| prediabetes | límite 12 m | ~semanal | ~quincenal | ~semanal | ~mensual | ~quincenal |

## Restricciones de reglas (`reglas.ts`)

- Señales de tendencia usan **últimas N** tomas → el desenlace clínico va al final.
- `PESO_BAJA`: primer vs último peso, ventana 60–400 días, caída >5%.
- `hipoglucemia`: última baja <54 y promedio de últimas 3 glucosas **<100** (si no, aparece `GLU_LIMITE`/`GLU_ALTA` de más).
- `respiratorio`: últimas 5 de pulso >100; últimas 3 sat <95; últimas 3 resp >20; fiebre en últimas 3 temps.

## Fuera de alcance

- Nuevos casos clínicos / señales faltantes (`GLU_BAJA`, `SAT_CRITICA`, …).
- Cartera masiva para crédito.
- Cambios a umbrales de `reglas.ts`.
