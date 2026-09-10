process.env.QVAC_CONFIG_PATH = new URL("./qvac.relays.config.json", import.meta.url).pathname;
await import("@qvac/sdk/dist/examples/delegated-inference/provider.js");
