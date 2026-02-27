/**
 * Patches Node.js module resolution to handle bun's .bun/ directory structure.
 *
 * In bun monorepos, transitive dependencies are stored in node_modules/.bun/
 * and only directly-declared dependencies get symlinks. This breaks tools like
 * Babel that use require.resolve() to find plugins, since they can't traverse
 * the .bun/ directory.
 *
 * This script is loaded via NODE_OPTIONS=--require before Jest starts,
 * so it patches resolution before Babel initializes its transform pipeline.
 */
const Module = require("module");
const { findInBunDir, extractPkgName } = require("./bun-resolve-utils");

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (err) {
    if (err.code !== "MODULE_NOT_FOUND") throw err;

    const pkgName = extractPkgName(request);
    const bunBase = findInBunDir(pkgName);
    if (bunBase) {
      try {
        return originalResolveFilename.call(this, request, parent, isMain, {
          ...options,
          paths: [bunBase],
        });
      } catch {
        // Didn't resolve in this .bun dir either
      }
    }

    throw err;
  }
};
