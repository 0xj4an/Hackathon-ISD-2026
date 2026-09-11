/**
 * Adaptador LoRA de laboratorio. Archivo aparte del MedPsy base: para
 * reemplazarlo basta cambiar el asset y `LORA_LAB_VERSION`.
 *
 * Corrida 3: lab JSON 5% → 68%. No se pone en cédula/ingresos/alerta.
 */
import { Asset } from "expo-asset";
import { File, Paths } from "expo-file-system";
import { recordError } from "./perf/logger";
import { reportarLoraSentry } from "./sentry";

/** Subir esto al cambiar el `.gguf` (y el nombre del asset). */
export const LORA_LAB_VERSION = "lab-v3";
export const LORA_LAB_NOMBRE = `lora-${LORA_LAB_VERSION}.gguf`;

let rutaCache: string | null = null;
let reportadoCache = false;

function pathLocal(uri: string): string {
  return uri.startsWith("file://") ? decodeURIComponent(uri.slice("file://".length)) : uri;
}

/**
 * Copia el asset al directorio de documentos la primera vez.
 * QVAC quiere un path de filesystem, no un require() de Metro.
 */
export async function rutaLoraLab(): Promise<string | null> {
  if (rutaCache) {
    if (!reportadoCache) {
      reportadoCache = true;
      reportarLoraSentry({ ok: true, version: LORA_LAB_VERSION, via: "cache" });
    }
    return rutaCache;
  }
  const dest = new File(Paths.document, LORA_LAB_NOMBRE);
  try {
    if (dest.exists && dest.size > 1_000_000) {
      rutaCache = pathLocal(dest.uri);
      reportadoCache = true;
      reportarLoraSentry({
        ok: true,
        version: LORA_LAB_VERSION,
        via: "cache",
        bytes: dest.size,
      });
      return rutaCache;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../assets/models/lora-lab-v3.gguf");
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const origenUri = asset.localUri ?? asset.uri;
    if (!origenUri) throw new Error("asset LoRA sin uri local");
    const origen = new File(origenUri);
    if (dest.exists) dest.delete();
    origen.copy(dest);
    if (!dest.exists || dest.size < 1_000_000) {
      throw new Error("copia LoRA incompleta");
    }
    rutaCache = pathLocal(dest.uri);
    reportadoCache = true;
    reportarLoraSentry({
      ok: true,
      version: LORA_LAB_VERSION,
      via: "copy",
      bytes: dest.size,
    });
    return rutaCache;
  } catch (err) {
    recordError("lora.lab", err);
    reportarLoraSentry({
      ok: false,
      version: LORA_LAB_VERSION,
      via: "miss",
      err: err instanceof Error ? err.message.slice(0, 120) : "miss",
    });
    return null;
  }
}
