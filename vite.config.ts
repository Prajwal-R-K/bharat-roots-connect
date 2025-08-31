import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure single React instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    // Dedupe React to avoid multiple copies with libraries like emoji-mart
    dedupe: ["react", "react-dom"],
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer', 'socket.io-client']
  }
}));
