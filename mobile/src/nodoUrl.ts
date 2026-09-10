import Constants from "expo-constants";

/** Pueblo en la LAN. Camino B del crédito y respaldo de MedPsy. */
export const NODO_URL_DEMO = "http://192.168.0.19:8788";

function hostDelMetro(): string | undefined {
  const uri = Constants.expoConfig?.hostUri;
  if (!uri) return;
  return uri.replace(/^\w+:\/\//, "").split(":")[0];
}

export function urlNodo(): string {
  const env = process.env.EXPO_PUBLIC_NODO_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = hostDelMetro();
  if (h && h !== "localhost" && h !== "127.0.0.1") return `http://${h}:8788`;
  if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:8788";
  return NODO_URL_DEMO;
}
