const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Adaptador LoRA (.gguf): se empaqueta como asset y se copia a documentos.
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), "gguf"];

module.exports = config;
