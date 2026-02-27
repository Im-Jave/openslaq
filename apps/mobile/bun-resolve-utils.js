/**
 * Shared utilities for resolving packages in bun's .bun/ directory structure.
 *
 * In bun monorepos, transitive dependencies are stored in node_modules/.bun/
 * and only directly-declared dependencies get symlinks. Both jest-bun-resolver.js
 * (Node.js Module._resolveFilename patch) and jest-resolver.js (Jest custom resolver)
 * need to search .bun/ — this module provides the shared logic.
 */
const path = require("path");
const fs = require("fs");

const monorepoRoot = path.resolve(__dirname, "../..");
const bunDir = path.join(monorepoRoot, "node_modules", ".bun");

// Cache: package name -> resolved directory (or null if not found)
const cache = new Map();

function extractPkgName(request) {
  if (request.startsWith("@")) {
    return request.split("/").slice(0, 2).join("/");
  }
  return request.split("/")[0];
}

function findInBunDir(pkgName) {
  const cached = cache.get(pkgName);
  if (cached !== undefined) return cached;

  const prefix = pkgName.replace(/\//g, "+");
  try {
    for (const entry of fs.readdirSync(bunDir)) {
      if (entry.startsWith(prefix + "@")) {
        const dir = path.join(bunDir, entry, "node_modules");
        cache.set(pkgName, dir);
        return dir;
      }
    }
  } catch {
    // .bun dir doesn't exist or isn't readable
  }

  cache.set(pkgName, null);
  return null;
}

module.exports = { findInBunDir, extractPkgName };
