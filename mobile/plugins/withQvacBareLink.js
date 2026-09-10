const { withDangerousMod } = require("expo/config-plugins");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * QVAC generates qvac/worker.bundle.js in prebuild but on EAS it often
 * does not copy it to @qvac/sdk/dist/worker.mobile.bundle.js (what
 * require() loads). Bare then starts with a JS worker and no native
 * addons → SIGABRT in libbare-kit. This plugin copies the bundle and
 * runs the platform linker after the QVAC expo plugin.
 */
function copyWorkerBundle(projectRoot) {
  const src = path.join(projectRoot, "qvac", "worker.bundle.js");
  if (!fs.existsSync(src)) {
    throw new Error(`[withQvacBareLink] missing ${src} after QVAC bundle step`);
  }
  const dest = path.join(
    projectRoot,
    "node_modules",
    "@qvac",
    "sdk",
    "dist",
    "worker.mobile.bundle.js",
  );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`[withQvacBareLink] copied ${src} -> ${dest}`);
}

function assertAddons(dir, minFiles) {
  if (!fs.existsSync(dir)) {
    throw new Error(`[withQvacBareLink] addons dir missing: ${dir}`);
  }
  const files = [];
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dir);
  console.log(`[withQvacBareLink] ${files.length} addon files in ${dir}`);
  if (files.length < minFiles) {
    throw new Error(
      `[withQvacBareLink] expected >= ${minFiles} linked addons, got ${files.length}`,
    );
  }
}

function withQvacBareLink(config) {
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      copyWorkerBundle(root);
      const linker = path.join(
        root,
        "node_modules",
        "react-native-bare-kit",
        "android",
        "link.mjs",
      );
      if (!fs.existsSync(linker)) {
        throw new Error(`[withQvacBareLink] missing ${linker}`);
      }
      execSync(`node "${linker}"`, { cwd: root, stdio: "inherit" });
      assertAddons(
        path.join(
          root,
          "node_modules",
          "react-native-bare-kit",
          "android",
          "src",
          "main",
          "addons",
        ),
        5,
      );
      return cfg;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      copyWorkerBundle(root);
      const linker = path.join(
        root,
        "node_modules",
        "react-native-bare-kit",
        "ios",
        "link.mjs",
      );
      if (fs.existsSync(linker)) {
        execSync(`node "${linker}"`, { cwd: root, stdio: "inherit" });
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withQvacBareLink;
