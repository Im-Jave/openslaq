import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import istanbul from "vite-plugin-istanbul";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.VITE_COVERAGE === "true"
      ? [istanbul({ include: "src/**/*", extension: [".ts", ".tsx"] })]
      : []),
  ],
  envDir: "../../",
  // @stackframe/stack references process.env (designed for Next.js).
  // Shim it so those references don't crash in the browser.
  define: {
    "process.env": "{}",
  },
  server: {
    port: 3000,
  },
});
