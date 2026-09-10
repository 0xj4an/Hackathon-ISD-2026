// Punto de entrada de Ina Igar.
//
// Cinco pantallas en orden: se entra con un correo, se revisa el historial de
// esa persona, se ve la alerta con lo que cuesta atenderla, se elige el monto
// del crédito y se cargan los documentos. El correo no es un login: es la llave
// del caso de la demo, y la pantalla lo dice.
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
import type { Usuario } from "./src/usuarios";

/** Lo que cuesta el paquete, y el monto que la persona decidió pedir. */
type Credito = { min: number; max: number; monto?: number };

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [revisado, setRevisado] = useState(false);
  const [credito, setCredito] = useState<Credito | null>(null);

  const salir = () => {
    setUsuario(null);
    setRevisado(false);
    setCredito(null);
  };

  if (!usuario) return <PantallaEntrada onEntrar={setUsuario} />;

  if (!revisado) {
    return <PantallaRevision usuario={usuario} onListo={() => setRevisado(true)} />;
  }

  if (!credito) {
    return (
      <PantallaAlerta
        usuario={usuario}
        onVolver={salir}
        onPedirCredito={(min, max) => setCredito({ min, max })}
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
