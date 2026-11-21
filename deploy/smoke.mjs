// Read-only production/staging smoke test.
// Usage: node deploy/smoke.mjs <frontend-url> <api-url>
const frontend = (process.argv[2] || "https://pa-nhom3.vercel.app").replace(/\/$/, "");
const api = (process.argv[3] || "https://linea-api-6pw5.onrender.com").replace(/\/$/, "");

async function read(url, parse) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
    return parse(await response.text());
  } finally {
    clearTimeout(timer);
  }
}

const checks = [
  ["frontend HTML", () => read(frontend, text => {
    if (!text.includes('id="root"')) throw new Error("missing #root");
    return "ok";
  })],
  ["/api/health", () => read(`${api}/api/health`, text => {
    const value = JSON.parse(text);
    if (!value.status) throw new Error("missing status");
    return value.status;
  })],
  ["/api/catalog/courses", () => read(`${api}/api/catalog/courses?page=1&pageSize=1`, text => {
    const value = JSON.parse(text);
    if (!Array.isArray(value.items)) throw new Error("missing items");
    return `${value.items.length} item(s)`;
  })],
  ["/api/community/posts", () => read(`${api}/api/community/posts?page=1`, text => {
    const value = JSON.parse(text);
    if (!Array.isArray(value)) throw new Error("expected an array");
    return `${value.length} post(s)`;
  })],
];

let failed = 0;
for (const [name, run] of checks) {
  try {
    console.log(`PASS ${name}: ${await run()}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : error}`);
  }
}
if (failed > 0) process.exitCode = 1;
