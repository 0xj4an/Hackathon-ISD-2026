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
import { Alert } from "react-native";
import PantallaEntrada from "./src/PantallaEntrada";
import PantallaRevision from "./src/PantallaRevision";
import PantallaAlerta from "./src/PantallaAlerta";
import PantallaCredito from "./src/PantallaCredito";
import PantallaDocumentos from "./src/PantallaDocumentos";
import PantallaDatos from "./src/PantallaDatos";
import PantallaCuota from "./src/PantallaCuota";
import PantallaExamen from "./src/PantallaExamen";
import type { Usuario } from "./src/usuarios";
import type { Solicitud } from "./src/core/credito/motor";

/** Lo que cuesta el paquete, y el monto que la persona decidió pedir. */
type Credito = { min: number; max: number; monto?: number };

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [revisado, setRevisado] = useState(false);
  const [credito, setCredito] = useState<Credito | null>(null);
  const [enExamen, setEnExamen] = useState(false);
  /** Documentos fotografiados: si hubo extracto, se preguntan sus campos. */
  const [conExtracto, setConExtracto] = useState<boolean | null>(null);
  /** Los campos confirmados. Con esto ya se puede calcular la cuota aqui mismo. */
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);

  const salir = () => {
    setUsuario(null);
    setRevisado(false);
    setCredito(null);
    setEnExamen(false);
    setConExtracto(null);
    setSolicitud(null);
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

  if (conExtracto === null) {
    return (
      <PantallaDocumentos
        monto={credito.monto}
        onListo={setConExtracto}
        onVolver={() => setCredito({ min: credito.min, max: credito.max })}
      />
    );
  }

  if (!solicitud) {
    return (
      <PantallaDatos
        monto={credito.monto}
        conExtracto={conExtracto}
        onListo={setSolicitud}
        onVolver={() => setConExtracto(null)}
      />
    );
  }

  return (
    <PantallaCuota
      solicitud={solicitud}
      onFirmar={() =>
        Alert.alert(
          "Todavía no se envía",
          "La firma, la cola y el envío al banco se conectan en el siguiente bloque. " +
            "La cuota que ves ya la calculó este teléfono, sin señal.",
        )
      }
      onVolver={() => setSolicitud(null)}
    />
  );
}
