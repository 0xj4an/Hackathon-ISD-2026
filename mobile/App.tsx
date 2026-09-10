// Punto de entrada de Ina Igar.
//
// La pantalla de casos es de demostración y lo dice: en uso normal la app
// leería el historial de quien la usa, no elegiría entre seis.
//
// Para depurar el bloque 0 en un teléfono nuevo, cambiar el import por
// `./src/SmokeTest` y montarlo directo: aísla si el problema es el teléfono,
// Expo o el SDK, en vez de nuestro código.
import { useState } from "react";
import PantallaUsuarios from "./src/PantallaUsuarios";
import PantallaAlerta from "./src/PantallaAlerta";
import type { Usuario } from "./src/usuarios";

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  return usuario
    ? <PantallaAlerta usuario={usuario} onVolver={() => setUsuario(null)} />
    : <PantallaUsuarios onElegir={setUsuario} />;
}
