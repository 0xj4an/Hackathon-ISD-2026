process.env.QVAC_CONFIG_PATH = new URL("./qvac.relays.config.json", import.meta.url).pathname;
await import(
  new URL(
    "./node_modules/@qvac/sdk/dist/examples/delegated-inference/provider.js",
    import.meta.url,
  )
);
