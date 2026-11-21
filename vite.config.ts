import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), "LOCAL_");
  return {
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js", "@supabase/ssr"],
          "vendor-validation": ["zod"],
          "vendor-icons": ["lucide-react"]
        }
      }
    }
  },
  server: {
    port: 5173,
    watch: { ignored: ["**/server/**/bin/**", "**/server/**/obj/**", "**/server/.data/**", "**/artifacts/**"] },
    proxy: {
      "/api": localEnv.LOCAL_API_PROXY_TARGET || "http://localhost:4174"
    }
  }
  };
});
