const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// mobile/ is deliberately excluded from the root npm workspace (so the
// Next.js web app's Railway build never touches Expo/RN deps), but it
// still depends on the sibling packages/core via a `file:` reference,
// which npm resolves as a symlink with no node_modules of its own —
// @finlight/core's own deps (zod, date-fns) live in the repo root's
// node_modules instead. Metro needs telling where to look for both.
config.watchFolders = [workspaceRoot];
config.resolver.unstable_enableSymlinks = true;

// mobile/node_modules first (so native modules like react/react-native
// resolve to the versions actually installed here, never the web app's
// react-dom-oriented copies at the repo root), root node_modules second
// as a fallback purely for @finlight/core's own dependencies.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
