// Punto de entrada de Ina Igar.
//
// El camino principal, en orden: se entra con un correo, se revisa el historial
// de esa persona, se ve la alerta con lo que cuesta atenderla, se elige el monto
// del crédito, se leen los documentos, se revisa lo leído, se ve la cuota y el
// banco responde. El correo no es un login: es la llave del caso de la demo.
//
// Tras el resultado (alerta o en orden) se puede pedir crédito y/o subir un
// examen. Si el lab sale fuera de rango, también se puede pedir crédito.
//
// Firmar: modo local-wifi intenta el banco; modos offline van al pueblo.
// Si tampoco hay nodo, la solicitud queda en SQLite (`cola`).
// Tras aprobación: trazo → desembolso simulado → Listo.
// Las fotos no salen. MedPsy en el teléfono; si no, texto al pueblo (/inferir).
// `PantallaDatos` sigue en el repo (deudas y personas a cargo) pero el camino
// de la demo pasa por lo leído → cuota → banco.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, View, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import PantallaArranque from "./src/PantallaArranque";
import PantallaEntrada from "./src/PantallaEntrada";
import PantallaSalud from "./src/PantallaSalud";
import PantallaRevision from "./src/PantallaRevision";
import PantallaAlerta from "./src/PantallaAlerta";
import PantallaCredito from "./src/PantallaCredito";
import PantallaLeido from "./src/PantallaLeido";
import PantallaCuota from "./src/PantallaCuota";
import PantallaEnvio, { type FaseEnvioVisual, type ViaEnvioVisual } from "./src/PantallaEnvio";
import PantallaBanco from "./src/PantallaBanco";
import PantallaExamen from "./src/PantallaExamen";
import PantallaFirma from "./src/PantallaFirma";
import PantallaDesembolso from "./src/PantallaDesembolso";
import ConsolaDemo from "./src/ConsolaDemo";
import { demoLog } from "./src/demoLog";
import { solicitudDeLectura, type LecturaCredito } from "./src/lectura";
import {
  consultarRespuesta,
  enviarSolicitud,
  hostDe,
  intentarBanco,
  intentarPueblo,
  type Envio,
} from "./src/envio";
import { animarPct, conBarraMinima, sleep, ENVIO_MS } from "./src/envioVisual";
import {
  borrarPendiente,
  guardarPendiente,
  leerPendiente,
} from "./src/cola";
import { iniciarColaSqlite } from "./src/colaSqlite";
import { marcarPasoSentry, marcarUsuarioSentry, reportarSesionSentry } from "./src/sentry";
import { soltarMedPsy } from "./src/medpsy";
import type { Respuesta } from "./src/core/credito/motor";
import type { Solicitud } from "./src/core/schemas";
import { buscarPorCorreo, type Usuario } from "./src/usuarios";
import { fijarModo, modo, resetModo, sinWifiDemo } from "./src/modo";
import { asegurarUrlNodo, cargarUrlNodo, descubrirPuebloLan } from "./src/nodoUrl";
import { cargarClaveP2p } from "./src/p2p";
import { IrInicioContext } from "./src/ui/componentes";
import { SDK_VERSION } from "./src/perf/logger";

void SplashScreen.preventAutoHideAsync().catch(() => null);

/** Lo que cuesta el paquete, y el monto que la persona decidió pedir. */
type Credito = { min: number; max: number; monto?: number };
type PasoCredito = "captura" | "leido" | "cuota" | "banco" | "firma" | "desembolso";

type EnvioUI = {
  fase: FaseEnvioVisual;
  via: ViaEnvioVisual;
  nodoHost?: string;
  pct: number;
};

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
  const [firmaHash, setFirmaHash] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [envioUI, setEnvioUI] = useState<EnvioUI | null>(null);
  const [pendiente, setPendiente] = useState(false);
  const [aviso, setAviso] = useState<string | undefined>();
  const [tecnicoEnvio, setTecnicoEnvio] = useState<string | undefined>();
  const [colaLista, setColaLista] = useState(false);
  const [arranqueDetalle, setArranqueDetalle] = useState("Abriendo…");
  const okNodoRef = useRef<(() => void) | null>(null);
  const vivoEnvioRef = useRef(true);
  const splashOcultoRef = useRef(false);

  const ocultarSplashNativo = useCallback(() => {
    if (splashOcultoRef.current) return;
    splashOcultoRef.current = true;
    void SplashScreen.hideAsync().catch(() => null);
  }, []);

  const soltarCredito = () => {
    vivoEnvioRef.current = false;
    okNodoRef.current = null;
    setPaso("captura");
    setLectura(null);
    setSolicitud(null);
    setRespuesta(null);
    setFirmaHash(undefined);
    setEnviando(false);
    setEnvioUI(null);
    setPendiente(false);
    setAviso(undefined);
    setTecnicoEnvio(undefined);
  };

  const salir = () => {
    resetModo();
    setUsuario(null);
    setConectado(false);
    setRevisado(false);
    setCredito(null);
    setEnExamen(false);
    soltarCredito();
  };

  /** Marca Ina Igar → pantalla de entrada (también cierra registro). */
  const irInicio = () => {
    setEnRegistro(false);
    salir();
  };

  const conInicio = (nodo: ReactNode) => (
    <IrInicioContext.Provider value={irInicio}>
      <View style={shell.flex}>
        {nodo}
        <ConsolaDemo />
      </View>
    </IrInicioContext.Provider>
  );

  const cerrarPendiente = async (id: string) => {
    setPendiente(false);
    setAviso(undefined);
    setTecnicoEnvio(undefined);
    await borrarPendiente(id);
  };

  const setFase = (patch: Partial<EnvioUI> & Pick<EnvioUI, "fase" | "via">) => {
    setEnvioUI(prev => ({
      pct: prev?.pct ?? 0,
      nodoHost: prev?.nodoHost,
      ...patch,
    }));
  };

  const esperarOkNodo = () =>
    new Promise<void>(resolve => {
      okNodoRef.current = resolve;
    });

  const aplicarResultadoEnvio = async (sol: Solicitud, r: Envio) => {
    setTecnicoEnvio(r.tecnico);
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

  const flujoPuebloVisual = async (sol: Solicitud, pedirOk: boolean): Promise<void> => {
    const vivo = () => vivoEnvioRef.current;

    setFase({ fase: "buscando", via: "pueblo", pct: 6 });
    const nodo = await conBarraMinima(
      asegurarUrlNodo(),
      ENVIO_MS.buscandoNodo,
      6,
      38,
      n => setFase({ fase: "buscando", via: "pueblo", pct: n }),
      vivo,
    );
    if (!nodo) {
      await aplicarResultadoEnvio(sol, {
        ok: false,
        envio: null,
        pendiente: false,
        detalle: "Sin red y sin el nodo del pueblo (no aparece en esta WiFi).",
        tecnico: `modo ${modo()}\nsin nodo en LAN`,
      });
      return;
    }

    const host = hostDe(nodo);
    setFase({ fase: "encontrado", via: "pueblo", nodoHost: host, pct: 42 });
    if (pedirOk) await esperarOkNodo();

    setFase({ fase: "conectando", via: "pueblo", nodoHost: host, pct: 48 });
    await animarPct(
      48,
      56,
      ENVIO_MS.conectando,
      n => setFase({ fase: "conectando", via: "pueblo", nodoHost: host, pct: n }),
      vivo,
    );

    setFase({ fase: "estudiando", via: "pueblo", nodoHost: host, pct: 58 });
    await animarPct(
      58,
      68,
      ENVIO_MS.estudiandoBanco,
      n => setFase({ fase: "estudiando", via: "pueblo", nodoHost: host, pct: n }),
      vivo,
    );

    setFase({ fase: "subiendo", via: "pueblo", nodoHost: host, pct: 70 });
    const envio = await conBarraMinima(
      intentarPueblo(sol, nodo),
      ENVIO_MS.subiendoPueblo,
      70,
      88,
      n => setFase({ fase: "subiendo", via: "pueblo", nodoHost: host, pct: n }),
      vivo,
    );

    setFase({ fase: "recibiendo", via: "pueblo", nodoHost: host, pct: 90 });
    await animarPct(
      90,
      100,
      ENVIO_MS.recibiendoPueblo,
      n => setFase({ fase: "recibiendo", via: "pueblo", nodoHost: host, pct: n }),
      vivo,
    );
    await sleep(ENVIO_MS.cierre);
    await aplicarResultadoEnvio(sol, envio);
  };

  const mandar = async (sol: Solicitud) => {
    if (enviando) return;
    vivoEnvioRef.current = true;
    setEnviando(true);
    setAviso(undefined);
    try {
      const vivo = () => vivoEnvioRef.current;

      if (sinWifiDemo()) {
        setFase({ fase: "aviso", via: "pueblo", pct: 4 });
        await sleep(ENVIO_MS.avisoOffline);
        await flujoPuebloVisual(sol, true);
        return;
      }

      // WiFi: teatro ISTMO-RISK → subir + recibir del banco.
      setFase({ fase: "estudiando", via: "banco", pct: 6 });
      await animarPct(
        6,
        28,
        ENVIO_MS.estudiandoBanco,
        n => setFase({ fase: "estudiando", via: "banco", pct: n }),
        vivo,
      );

      setFase({ fase: "subiendo", via: "banco", pct: 30 });
      const banco = await conBarraMinima(
        intentarBanco(sol),
        ENVIO_MS.subiendoBanco,
        30,
        62,
        n => setFase({ fase: "subiendo", via: "banco", pct: n }),
        vivo,
      );

      if (banco.ok) {
        setFase({ fase: "recibiendo", via: "banco", pct: 64 });
        await animarPct(
          64,
          100,
          ENVIO_MS.recibiendoBanco,
          n => setFase({ fase: "recibiendo", via: "banco", pct: n }),
          vivo,
        );
        await sleep(ENVIO_MS.cierre);
        await aplicarResultadoEnvio(sol, {
          ok: true,
          envio: "banco",
          respuesta: banco.respuesta,
          tecnico: banco.tecnico,
        });
        return;
      }

      // Banco no respondió final: mismo teatro hacia el nodo (sin OK, video sigue).
      setFase({ fase: "aviso", via: "pueblo", pct: 4 });
      await sleep(ENVIO_MS.avisoFallback);
      await flujoPuebloVisual(sol, false);
    } finally {
      okNodoRef.current = null;
      setEnvioUI(null);
      setEnviando(false);
    }
  };

  useEffect(() => {
    let vivo = true;
    const t0 = Date.now();
    /** Mínimo visible para el video / demo (el boot real suele ser <200ms). */
    const MIN_ARRANQUE_MS = 1800;
    void (async () => {
      let colaPendiente = false;
      try {
        setArranqueDetalle("Cargando el pueblo…");
        await cargarUrlNodo();
        await cargarClaveP2p();
        if (!vivo) return;
        setArranqueDetalle("Preparando la cola…");
        await iniciarColaSqlite();
        if (!vivo) return;
        setArranqueDetalle("Revisando pendientes…");
        const p = await leerPendiente();
        if (!vivo) return;
        if (p) {
          colaPendiente = true;
          const u = buscarPorCorreo(p.usuario_correo);
          if (!u) {
            /* pendiente huérfana: seguimos al arranque normal */
          } else {
            setUsuario(u);
            setConectado(true);
            setRevisado(true);
            setCredito({ min: p.costo_min, max: p.costo_max, monto: p.solicitud.monto_solicitado_usd });
            setSolicitud(p.solicitud);
            setPendiente(true);
            setAviso(p.detalle);
            setPaso("cuota");
          }
        }
      } finally {
        if (vivo) {
          setArranqueDetalle("Listo");
          const falta = MIN_ARRANQUE_MS - (Date.now() - t0);
          if (falta > 0) await sleep(falta);
          if (!vivo) return;
          setColaLista(true);
          reportarSesionSentry({
            modo: modo(),
            sdk: SDK_VERSION,
            colaPendiente,
          });
        }
        // No bloquea la UI: el envío también llama asegurarUrlNodo.
        void descubrirPuebloLan().catch(() => null);
      }
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    marcarUsuarioSentry(usuario?.correo);
  }, [usuario]);

  /** Suelta MedPsy al ir a background: WatchdogTermination por RAM (Sentry ×6). */
  useEffect(() => {
    const sub = AppState.addEventListener("change", estado => {
      if (estado === "background" || estado === "inactive") {
        void soltarMedPsy(true);
      }
    });
    return () => sub.remove();
  }, []);

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
      setTecnicoEnvio(r.tecnico);
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
      } else {
        setAviso(`${r.detalle} La solicitud queda pendiente.`);
      }
    };
    const id = setInterval(tick, 4000);
    return () => { vivo = false; clearInterval(id); };
  }, [pendiente, solicitud, usuario, credito]);

  if (!colaLista) {
    return (
      <View style={shell.flex}>
        <PantallaArranque
          detalle={arranqueDetalle}
          onMostrada={ocultarSplashNativo}
        />
      </View>
    );
  }

  // Fuera del camino de la demo a proposito: los registros son para nosotros,
  // no para el usuario, y no aparecen en el flujo que se graba.
  // require() y no import: expo-sharing no puede tumbar el arranque.
  if (enRegistro) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PantallaRegistro: typeof import("./src/PantallaRegistro").default =
      require("./src/PantallaRegistro").default;
    return conInicio(<PantallaRegistro onVolver={() => setEnRegistro(false)} />);
  }

  if (!usuario) {
    return conInicio(
      <PantallaEntrada
        onEntrar={(u, m) => {
          fijarModo(m);
          demoLog(`sesión modo=${m} caso=${u.id}`);
          setUsuario(u);
        }}
        onRegistro={() => setEnRegistro(true)}
      />,
    );
  }

  // De donde salen las mediciones. Es simulacion declarada, no conexion real:
  // sin este paso la app salta del correo a un hallazgo y nadie entiende de
  // donde salieron los numeros.
  if (!conectado) {
    return conInicio(
      <PantallaSalud
        usuario={usuario}
        onListo={() => setConectado(true)}
        onVolver={salir}
      />,
    );
  }

  if (!revisado) {
    return conInicio(
      <PantallaRevision
        usuario={usuario}
        onListo={() => setRevisado(true)}
      />,
    );
  }

  if (enExamen) {
    return conInicio(
      <PantallaExamen
        usuario={usuario}
        onVolver={() => setEnExamen(false)}
        onPedirCredito={(min, max) => {
          setEnExamen(false);
          setCredito({ min, max });
        }}
      />,
    );
  }

  if (!credito) {
    return conInicio(
      <PantallaAlerta
        usuario={usuario}
        onVolver={salir}
        onPedirCredito={(min, max) => setCredito({ min, max })}
        onSubirExamen={() => setEnExamen(true)}
      />,
    );
  }

  const monto = credito.monto;
  if (monto === undefined) {
    return conInicio(
      <PantallaCredito
        costoMin={credito.min}
        costoMax={credito.max}
        onContinuar={pedido => {
          soltarCredito();
          setCredito({ ...credito, monto: pedido });
        }}
        onVolver={() => setCredito(null)}
      />,
    );
  }

  if (paso === "desembolso" && respuesta) {
    const destino = solicitud?.extracto?.banco
      ? `Cuenta en ${solicitud.extracto.banco}`
      : "tu cuenta registrada";
    return conInicio(
      <PantallaDesembolso
        respuesta={respuesta}
        destino={destino}
        constancia={firmaHash}
        onListo={() => {
          // Sale del caso entero. Si solo soltamos crédito, cae otra vez en Alerta.
          salir();
        }}
      />,
    );
  }

  if (paso === "firma" && respuesta) {
    return conInicio(
      <PantallaFirma
        respuesta={respuesta}
        onConfirmar={hash => {
          setFirmaHash(hash);
          setPaso("desembolso");
        }}
        onVolver={() => setPaso("banco")}
      />,
    );
  }

  if (paso === "banco" && respuesta) {
    return conInicio(
      <PantallaBanco
        respuesta={respuesta}
        onContinuar={() => setPaso("firma")}
        onVolver={() => {
          setRespuesta(null);
          setPaso("cuota");
        }}
      />,
    );
  }

  if (envioUI) {
    return conInicio(
      <PantallaEnvio
        fase={envioUI.fase}
        via={envioUI.via}
        nodoHost={envioUI.nodoHost}
        pct={envioUI.pct}
        onContinuar={
          envioUI.fase === "encontrado"
            ? () => {
                const r = okNodoRef.current;
                okNodoRef.current = null;
                r?.();
              }
            : undefined
        }
      />,
    );
  }

  if (paso === "cuota" && solicitud) {
    return conInicio(
      <PantallaCuota
        solicitud={solicitud}
        enviando={enviando}
        pendiente={pendiente}
        aviso={aviso}
        tecnico={tecnicoEnvio}
        onFirmar={() => { void mandar(solicitud); }}
        onVolver={() => setPaso("leido")}
      />,
    );
  }

  if (paso === "leido" && lectura) {
    return conInicio(
      <PantallaLeido
        lectura={lectura}
        onFirmar={() => {
          setSolicitud(solicitudDeLectura(monto, lectura));
          setPaso("cuota");
        }}
        onVolver={() => setPaso("captura")}
      />,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PantallaDocumentos: typeof import("./src/PantallaDocumentos").default =
    require("./src/PantallaDocumentos").default;
  return conInicio(
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
    />,
  );
}

const shell = StyleSheet.create({
  flex: { flex: 1 },
});
