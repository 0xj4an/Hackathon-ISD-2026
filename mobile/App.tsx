// Punto de entrada de Ina Igar.
//
// El camino principal, en orden: se entra con un correo, se revisa el historial
// de esa persona, se ve la alerta con lo que cuesta atenderla, se elige el monto
// del crédito y se cargan los documentos. El correo no es un login: es la llave
// del caso de la demo, y la pantalla lo dice.
//
// De la alerta cuelga la vía B, que no es un paso del camino sino una salida
// lateral: la persona trae un examen de laboratorio en papel y la app se lo lee.
// Vuelve a la alerta, no sigue hacia el crédito.
//
// Para depurar el bloque 0 en un teléfono nuevo, cambiar el import por
// `./src/SmokeTest` y montarlo directo: aísla si el problema es el teléfono,
// Expo o el SDK, en vez de nuestro código.
import { useState } from "react";
import PantallaEntrada from "./src/PantallaEntrada";
import PantallaRevision from "./src/PantallaRevision";
import PantallaAlerta from "./src/PantallaAlerta";
import PantallaCredito from "./src/PantallaCredito";
import PantallaDocumentos from "./src/PantallaDocumentos";
import PantallaExamen from "./src/PantallaExamen";
import type { Usuario } from "./src/usuarios";

/** Lo que cuesta el paquete, y el monto que la persona decidió pedir. */
type Credito = { min: number; max: number; monto?: number };

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [revisado, setRevisado] = useState(false);
  const [credito, setCredito] = useState<Credito | null>(null);
  const [enExamen, setEnExamen] = useState(false);

  const salir = () => {
    setUsuario(null);
    setRevisado(false);
    setCredito(null);
    setEnExamen(false);
  };

  if (!usuario) return <PantallaEntrada onEntrar={setUsuario} />;

  if (!revisado) {
    return <PantallaRevision usuario={usuario} onListo={() => setRevisado(true)} />;
  }

  if (enExamen) {
    return <PantallaExamen usuario={usuario} onVolver={() => setEnExamen(false)} />;
  }

  if (!credito) {
    return (
      <PantallaAlerta
        usuario={usuario}
        onVolver={salir}
        onPedirCredito={(min, max) => setCredito({ min, max })}
        onSubirExamen={() => setEnExamen(true)}
      />
    );
  }

  if (credito.monto === undefined) {
    return (
      <PantallaCredito
        costoMin={credito.min}
        costoMax={credito.max}
        onContinuar={monto => setCredito({ ...credito, monto })}
        onVolver={() => setCredito(null)}
      />
    );
  }

  return (
    <PantallaDocumentos
      monto={credito.monto}
      onVolver={() => setCredito({ min: credito.min, max: credito.max })}
    />
  );
}
