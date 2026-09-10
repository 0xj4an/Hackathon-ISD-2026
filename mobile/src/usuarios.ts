/**
 * Los usuarios de la demo. Datos 100% sinteticos, generados por
 * `data/generar-usuarios.mjs` y copiados aqui para que el bundle de Metro los
 * empaquete: la app no lee del disco ni de la red.
 *
 * En produccion estas mediciones vendrian de Health Connect. Para el hackathon
 * se cargan de archivo, y eso se declara en el README.
 */
import type { Medicion } from "./core/reglas";

import sano from "./datos/sano.json";
import diabetes from "./datos/diabetes.json";
import hipertension from "./datos/hipertension.json";
import respiratorio from "./datos/respiratorio.json";
import hipoglucemia from "./datos/hipoglucemia.json";
import prediabetes from "./datos/prediabetes.json";

export type Usuario = {
  id: string;
  /** Con este correo se entra al caso. Es de la demo: no hay cuenta ni contraseña. */
  correo: string;
  nombre: string;
  sexo: "hombre" | "mujer";
  edad: number;
  caso: string;
  descripcion: string;
  contexto: string;
  senales_esperadas: string[];
  mediciones: Medicion[];
};

export const USUARIOS: Usuario[] = [
  sano, diabetes, hipertension, respiratorio, hipoglucemia, prediabetes,
] as unknown as Usuario[];

const normalizar = (correo: string) => correo.trim().toLowerCase();

export const buscarPorCorreo = (correo: string): Usuario | undefined =>
  USUARIOS.find(u => u.correo === normalizar(correo));
