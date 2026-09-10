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
// Firmar intenta el banco remoto si hay wifi (camino A). Si no hay internet,
// deja el JSON en el nodo del pueblo (camino B). Si tampoco hay nodo, la
// solicitud queda en SQLite (`cola`) y se reintenta al volver la red.
// Las fotos no salen. La alerta y la extracción intentan MedPsy en el
// teléfono; si el modelo no carga, el texto va al pueblo.
// `PantallaDatos` sigue en el repo (deudas y personas a cargo, pantalla 11 del
// mapa) pero el camino de la demo pasa por lo leído → cuota → banco.
//
// Para depurar el bloque 0 en un teléfono nuevo, cambiar el import por
// `./src/SmokeTest` y montarlo directo: aísla si el problema es el teléfono,
// Expo o el SDK, en vez de nuestro código.
import { useEffect, useState } from "react";
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
import { consultarRespuesta, enviarSolicitud } from "./src/envio";
import {
  borrarPendiente,
  guardarPendiente,
  leerPendiente,
} from "./src/cola";
import { iniciarColaSqlite } from "./src/colaSqlite";
import { marcarPasoSentry, marcarUsuarioSentry } from "./src/sentry";
import type { Respuesta } from "./src/core/credito/motor";
import type { Solicitud } from "./src/core/schemas";
import { buscarPorCorreo, type Usuario } from "./src/usuarios";

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
  const [enviando, setEnviando] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [aviso, setAviso] = useState<string | undefined>();
  const [colaLista, setColaLista] = useState(false);

  const soltarCredito = () => {
    setPaso("captura");
    setLectura(null);
    setSolicitud(null);
    setRespuesta(null);
    setEnviando(false);
    setPendiente(false);
    setAviso(undefined);
  };

  const salir = () => {
    setUsuario(null);
    setConectado(false);
    setRevisado(false);
    setCredito(null);
    setEnExamen(false);
    soltarCredito();
  };

  const cerrarPendiente = async (id: string) => {
    setPendiente(false);
    setAviso(undefined);
    await borrarPendiente(id);
  };

  const mandar = async (sol: Solicitud) => {
    if (enviando) return;
    setEnviando(true);
    const r = await enviarSolicitud(sol);
    setEnviando(false);
    if (r.ok) {
      await cerrarPendiente(sol.id);
      setRespuesta(r.respuesta);
      setPaso("banco");
      return;
    }
    const detalle = r.pendiente
      ? r.detalle
      : `${r.detalle} La solicitud queda pendiente.`;
    setPendiente(true);
    setAviso(detalle);
    if (usuario && credito) {
      await guardarPendiente({
        solicitud: sol,
        detalle,
        usuario_correo: usuario.correo,
        costo_min: credito.min,
        costo_max: credito.max,
      });
    }
  };

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        await iniciarColaSqlite();
        const p = await leerPendiente();
        if (!vivo || !p) return;
        const u = buscarPorCorreo(p.usuario_correo);
        if (!u) return;
        setUsuario(u);
        setConectado(true);
        setRevisado(true);
        setCredito({ min: p.costo_min, max: p.costo_max, monto: p.solicitud.monto_solicitado_usd });
        setSolicitud(p.solicitud);
        setPendiente(true);
        setAviso(p.detalle);
        setPaso("cuota");
      } finally {
        if (vivo) setColaLista(true);
      }
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    marcarUsuarioSentry(usuario?.correo);
  }, [usuario]);

  useEffect(() => {
    if (enRegistro) return marcarPasoSentry("registro");
    if (!usuario) return marcarPasoSentry("entrada");
    if (!conectado) return marcarPasoSentry("salud");
    if (!revisado) return marcarPasoSentry("revision");
    if (enExamen) return marcarPasoSentry("examen");
    if (!credito) return marcarPasoSentry("alerta");
    if (credito.monto === undefined) return marcarPasoSentry("credito");
    marcarPasoSentry(paso, pendiente ? { pendiente: true } : undefined);
  }, [usuario, conectado, revisado, enExamen, enRegistro, credito, paso, pendiente]);

  useEffect(() => {
    if (!pendiente || !solicitud) return;
    let vivo = true;
    let ocupado = false;
    const tick = async () => {
      if (ocupado) return;
      ocupado = true;
      const vista = await consultarRespuesta(solicitud.id);
      if (vivo && vista) {
        await cerrarPendiente(solicitud.id);
        setRespuesta(vista);
        setPaso("banco");
        ocupado = false;
        return;
      }
      const r = await enviarSolicitud(solicitud);
      ocupado = false;
      if (!vivo) return;
      if (r.ok) {
        await cerrarPendiente(solicitud.id);
        setRespuesta(r.respuesta);
        setPaso("banco");
      } else if (r.pendiente) {
        setAviso(r.detalle);
        if (usuario && credito) {
          await guardarPendiente({
            solicitud,
            detalle: r.detalle,
            usuario_correo: usuario.correo,
            costo_min: credito.min,
            costo_max: credito.max,
          });
        }
      }
    };
    const id = setInterval(tick, 4000);
    return () => { vivo = false; clearInterval(id); };
  }, [pendiente, solicitud, usuario, credito]);

  if (!colaLista) return null;

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
        enviando={enviando}
        pendiente={pendiente}
        aviso={aviso}
        onFirmar={() => { void mandar(solicitud); }}
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
