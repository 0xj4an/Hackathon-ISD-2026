/** Banco remoto. Camino A: el teléfono le habla directo cuando hay wifi. */
export const BANCO_URL_DEMO = "https://banco-production-3755.up.railway.app";

export function urlBanco(): string {
  return (process.env.EXPO_PUBLIC_BANCO_URL || BANCO_URL_DEMO).replace(/\/$/, "");
}
