# Datasets de usuarios demo · historial clínico de un año

**Fecha:** 2026-09-10  
**Estado:** implementado  
**Alcance:** usuarios de demo en `data/usuarios/` (vía A completa)

## Objetivo

Cada caso de demo lleva un historial sintético de **~365 días** con densidades
creíbles por variable. Las `senales_esperadas` son el contrato de
`eval/run.mjs`.

## Decisiones

1. **Nueve usuarios** que entre todos ejercitan las **14 señales** de `ADR-008`
   vía A. Tres casos dedicados cierran el hueco: `glu-leve` (`GLU_BAJA`),
   `sat-critica` (`SAT_CRITICA`), `resp-grave` (`RESP_MUY_ALTA`).
2. **Densidad clínica:** frecuencia por variable y por caso. Agudos = baseline
   anual + episodio reciente.
3. **Semilla fija** en `data/generar-usuarios.mjs`.
4. **Salida dual:** `data/usuarios/` y `mobile/src/datos/`.
5. **Un caso, pocas señales:** los tres nuevos disparan exactamente una señal
   cada uno, para mostrar el escalón leve vs grave (p. ej. `GLU_BAJA` vs
   `GLU_MUY_BAJA`).

## Roster

| id | Correo | Señales |
| --- | --- | --- |
| sano | control@gmail.com | (ninguna) |
| diabetes | insulina@gmail.com | GLU_ALTA, PRES_ALTA, PESO_BAJA, IMC_SOBREPESO |
| hipertension | presion@gmail.com | PRES_ALTA, IMC_OBESIDAD |
| respiratorio | fiebre@gmail.com | FIEBRE, RESP_ALTA, SAT_BAJA, TAQUI |
| hipoglucemia | azucar@gmail.com | GLU_MUY_BAJA |
| prediabetes | limite@gmail.com | GLU_LIMITE, IMC_SOBREPESO |
| glu-leve | alerta@gmail.com | GLU_BAJA |
| sat-critica | oxigeno@gmail.com | SAT_CRITICA |
| resp-grave | ahogo@gmail.com | RESP_MUY_ALTA |

## Fuera de alcance

- Vía B (marcadores de laboratorio) como perfiles de usuario en la demo.
- Cartera masiva para crédito.
- Cambios a umbrales de `reglas.ts`.
