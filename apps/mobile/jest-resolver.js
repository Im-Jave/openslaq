/**
 * Custom Jest resolver that handles bun's .bun/ directory structure.
 *
 * Jest has its own module resolution that bypasses Node.js Module._resolveFilename.
 * This resolver wraps the default resolver and falls back to searching .bun/
 * when a package can't be found through normal resolution.
 */
const { findInBunDir, extractPkgName } = require("./bun-resolve-utils");

module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (err) {
    if (err.code !== "MODULE_NOT_FOUND") throw err;

    const pkgName = extractPkgName(request);
    const bunBase = findInBunDir(pkgName);
    if (bunBase) {
      try {
        return options.defaultResolver(request, {
          ...options,
          rootDir: bunBase,
          basedir: bunBase,
          paths: [...(options.paths || []), bunBase],
        });
      } catch {
        // Didn't resolve in this .bun dir either
      }
    }

    throw err;
  }
};
