/**
 * Persistencia durable de la cola en expo-sqlite.
 * Solo se importa desde el arranque de la app (no desde eval en Node).
 */
import * as SQLite from "expo-sqlite";
import { usarCola, type ColaStore, type PendienteCredito } from "./cola";

const DB = "ina-igar-cola.db";

export async function iniciarColaSqlite(): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pendiente (
      k INTEGER PRIMARY KEY CHECK (k = 1),
      id TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);

  const store: ColaStore = {
    async guardar(p: PendienteCredito) {
      const payload = JSON.stringify(p);
      await db.runAsync(
        "INSERT OR REPLACE INTO pendiente (k, id, payload) VALUES (1, ?, ?)",
        p.solicitud.id,
        payload,
      );
    },
    async leer() {
      const row = await db.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM pendiente WHERE k = 1",
      );
      if (!row?.payload) return null;
      try {
        return JSON.parse(row.payload) as PendienteCredito;
      } catch {
        return null;
      }
    },
    async borrar(id: string) {
      await db.runAsync("DELETE FROM pendiente WHERE k = 1 AND id = ?", id);
    },
  };

  usarCola(store);
}
