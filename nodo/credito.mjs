// El banco decide. Este archivo ya no tiene politica: la politica vive en
// mobile/src/core/credito/, y el nodo la importa tal cual.
//
// Node 22 lee TypeScript sin build, asi que no hay copia ni paso de compilacion:
// el nodo corre EXACTAMENTE el mismo codigo que el telefono usa para
// precalificar. Si hubiera dos copias, la del banco y la del telefono podrian
// dar numeros distintos y nadie se enteraria hasta la demo.
//
// El modelo esta entrenado sobre cartera sintetica y no representa la politica
// de ningun banco real. Se declara en pantalla y en el README.

import { decidir as decidirConMotor } from "../mobile/src/core/credito/motor.ts";

/**
 * Contexto que solo el banco tiene. En un banco de verdad esto sale de APC
 * Intelidat (Ley 24 de 2002) y de la tesoreria. Aqui se simula, y se dice.
 */
function contextoDelBanco(sol) {
  // Sin consulta real de bureau: la demo no tiene red garantizada y no vamos a
  // inventar un historial que no existe. Cero dias de mora es el supuesto
  // declarado, no un dato.
  return { bureau: { peor_mora_dias: 0 } };
}

export function decidir(sol) {
  return decidirConMotor(sol, contextoDelBanco(sol), new Date());
}
