// Punto de entrada de Ina Igar.
//
// El camino principal, en orden: se entra con un correo, se revisa el historial
// de esa persona, se ve la alerta con lo que cuesta atenderla, se elige el monto
// del crédito, se leen los documentos, se revisa lo leído, se ve la cuota y el
// banco responde. El correo no es un login: es la llave del caso de la demo.
//
// De la alerta cuelga la vía B, que no es un paso del camino sino una salida
// lateral: la persona trae un examen de laboratorio en papel y la app se lo lee.
// Vuelve a la alerta, no sigue hacia el crédito.
//
// Firmar y enviar corre `decidir()` aquí mismo, con bureau de demo en mora 0.
// La cola SQLite y el HTTP al nodo siguen pendientes.
// `PantallaDatos` sigue en el repo (deudas y personas a cargo, pantalla 11 del
// mapa) pero el camino de la demo pasa por lo leído → cuota → banco.
//
// Para depurar el bloque 0 en un teléfono nuevo, cambiar el import por
// `./src/SmokeTest` y montarlo directo: aísla si el problema es el teléfono,
// Expo o el SDK, en vez de nuestro código.
import { useState } from "react";
import PantallaEntrada from "./src/PantallaEntrada";
import PantallaSalud from "./src/PantallaSalud";
import PantallaRevision from "./src/PantallaRevision";
import PantallaAlerta from "./src/PantallaAlerta";
import PantallaCredito from "./src/PantallaCredito";
import PantallaLeido from "./src/PantallaLeido";
import PantallaCuota from "./src/PantallaCuota";
import PantallaBanco from "./src/PantallaBanco";
import PantallaExamen from "./src/PantallaExamen";
import { solicitudDeLectura, type LecturaCredito } from "./src/lectura";
import { decidir, type Respuesta, type Solicitud } from "./src/core/credito/motor";
import type { Usuario } from "./src/usuarios";

/** Lo que cuesta el paquete, y el monto que la persona decidió pedir. */
type Credito = { min: number; max: number; monto?: number };
type PasoCredito = "captura" | "leido" | "cuota" | "banco";

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [conectado, setConectado] = useState(false);
  const [revisado, setRevisado] = useState(false);
  const [credito, setCredito] = useState<Credito | null>(null);
  const [enExamen, setEnExamen] = useState(false);
  const [enRegistro, setEnRegistro] = useState(false);
  const [paso, setPaso] = useState<PasoCredito>("captura");
  const [lectura, setLectura] = useState<LecturaCredito | null>(null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

  const soltarCredito = () => {
    setPaso("captura");
    setLectura(null);
    setSolicitud(null);
    setRespuesta(null);
  };

  const salir = () => {
    setUsuario(null);
    setConectado(false);
    setRevisado(false);
    setCredito(null);
    setEnExamen(false);
    soltarCredito();
  };

  // Fuera del camino de la demo a proposito: los registros son para nosotros,
  // no para el usuario, y no aparecen en el flujo que se graba.
  // require() y no import: expo-sharing no puede tumbar el arranque.
  if (enRegistro) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PantallaRegistro: typeof import("./src/PantallaRegistro").default =
      require("./src/PantallaRegistro").default;
    return <PantallaRegistro onVolver={() => setEnRegistro(false)} />;
  }

  if (!usuario) {
    return <PantallaEntrada onEntrar={setUsuario} onRegistro={() => setEnRegistro(true)} />;
  }

  // De donde salen las mediciones. Es simulacion declarada, no conexion real:
  // sin este paso la app salta del correo a un hallazgo y nadie entiende de
  // donde salieron los numeros.
  if (!conectado) {
    return (
      <PantallaSalud
        usuario={usuario}
        onListo={() => setConectado(true)}
        onVolver={salir}
      />
    );
  }

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

  const monto = credito.monto;
  if (monto === undefined) {
    return (
      <PantallaCredito
        costoMin={credito.min}
        costoMax={credito.max}
        onContinuar={pedido => {
          soltarCredito();
          setCredito({ ...credito, monto: pedido });
        }}
        onVolver={() => setCredito(null)}
      />
    );
  }

  if (paso === "banco" && respuesta) {
    return (
      <PantallaBanco
        respuesta={respuesta}
        onAceptar={() => {
          setCredito(null);
          soltarCredito();
        }}
        onVolver={() => {
          setRespuesta(null);
          setPaso("cuota");
        }}
      />
    );
  }

  if (paso === "cuota" && solicitud) {
    return (
      <PantallaCuota
        solicitud={solicitud}
        onFirmar={() => {
          setRespuesta(decidir(solicitud, { bureau: { peor_mora_dias: 0 } }));
          setPaso("banco");
        }}
        onVolver={() => setPaso("leido")}
      />
    );
  }

  if (paso === "leido" && lectura) {
    return (
      <PantallaLeido
        lectura={lectura}
        onFirmar={() => {
          setSolicitud(solicitudDeLectura(monto, lectura));
          setPaso("cuota");
        }}
        onVolver={() => setPaso("captura")}
      />
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PantallaDocumentos: typeof import("./src/PantallaDocumentos").default =
    require("./src/PantallaDocumentos").default;
  return (
    <PantallaDocumentos
      monto={monto}
      lecturaInicial={lectura ?? undefined}
      onListo={siguiente => {
        setLectura(siguiente);
        setPaso("leido");
      }}
      onVolver={() => {
        soltarCredito();
        setCredito({ min: credito.min, max: credito.max });
      }}
    />
  );
}
