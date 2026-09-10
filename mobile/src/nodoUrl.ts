import Constants from "expo-constants";

/** Pueblo en la LAN. Camino B del crédito y respaldo de MedPsy. */
export const NODO_URL_DEMO = "http://192.168.0.19:8788";

function esIpLan(host: string): boolean {
  return (
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)
  );
}

function hostDelMetro(): string | undefined {
  const uri = Constants.expoConfig?.hostUri;
  if (!uri) return;
  return uri.replace(/^\w+:\/\//, "").split(":")[0];
}

export function urlNodo(): string {
  const env = process.env.EXPO_PUBLIC_NODO_URL?.replace(/\/$/, "");
  if (env) return env;
  // Solo si Metro está en LAN. Un tunnel (*.exp.direct) no es el pueblo.
  const h = hostDelMetro();
  if (h && esIpLan(h)) return `http://${h}:8788`;
  return NODO_URL_DEMO;
}
