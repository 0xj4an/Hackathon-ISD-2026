import { Component, type ReactNode } from "react";
import { SafeAreaView, Text } from "react-native";
import { registerRootComponent } from "expo";
import { iniciarSentry, Sentry } from "./src/sentry";

iniciarSentry();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.

class ErrorDeArranque extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack ?? undefined } },
    });
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", padding: 24, justifyContent: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#101010" }}>La app se cayó</Text>
          <Text style={{ marginTop: 12, fontSize: 16, color: "#101010" }}>{this.state.error.message}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function pantallaRota(mensaje: string) {
  return function ArranqueRoto() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", padding: 24, justifyContent: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#101010" }}>No arrancó</Text>
        <Text style={{ marginTop: 12, fontSize: 16, color: "#101010" }}>{mensaje}</Text>
      </SafeAreaView>
    );
  };
}

try {
  // require, no import: si un nativo revienta al cargar App, Release no se queda en blanco.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const App = require("./App").default;
  function Raiz() {
    return (
      <ErrorDeArranque>
        <App />
      </ErrorDeArranque>
    );
  }
  registerRootComponent(Sentry.wrap(Raiz));
} catch (err) {
  Sentry.captureException(err);
  const mensaje = err instanceof Error ? err.message : String(err);
  registerRootComponent(pantallaRota(mensaje));
}
