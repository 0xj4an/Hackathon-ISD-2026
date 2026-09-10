/**
 * Los usuarios de la demo. Datos 100% sinteticos, generados por
 * `data/generar-usuarios.mjs` y copiados aqui para que el bundle de Metro los
 * empaquete: la app no lee del disco ni de la red.
 *
 * En produccion estas mediciones vendrian de Health Connect. Para el hackathon
 * se cargan de archivo, y eso se declara en el README.
 */
import type { Medicion } from "./core/reglas";

import a from "./datos/a.json";
import b from "./datos/b.json";
import c from "./datos/c.json";
import d from "./datos/d.json";
import e from "./datos/e.json";
import f from "./datos/f.json";

export type Usuario = {
  id: string;
  nombre: string;
  sexo: "hombre" | "mujer";
  edad: number;
  caso: string;
  descripcion: string;
  contexto: string;
  senales_esperadas: string[];
  mediciones: Medicion[];
};

export const USUARIOS: Usuario[] = [a, b, c, d, e, f] as unknown as Usuario[];

export const buscarUsuario = (id: string): Usuario | undefined =>
  USUARIOS.find(u => u.id.toLowerCase() === id.toLowerCase());
