import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), "LOCAL_");
  return {
  plugins: [react()],
  server: {
    port: 5173,
    watch: { ignored: ["**/server/**/bin/**", "**/server/**/obj/**"] },
    proxy: {
      "/api": localEnv.LOCAL_API_PROXY_TARGET || "http://localhost:4174"
    }
  }
  };
});
