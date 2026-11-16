import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL } from "node:url";
import { loadEnv } from "vite";

const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
let api;
try {
  api = new URL(env.VITE_API_URL?.trim() ?? "");
} catch {
  throw new Error("Set VITE_API_URL to the public HTTPS backend URL before deploying.");
}
if (api.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(api.hostname)
  || api.username || api.password || api.pathname !== "/" || api.search || api.hash) {
  throw new Error("VITE_API_URL must be a public HTTPS origin, e.g. https://your-api.onrender.com (without /api).");
}

const result = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "-b"], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const build = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], { stdio: "inherit" });
if (build.error) throw build.error;
process.exit(build.status ?? 1);
