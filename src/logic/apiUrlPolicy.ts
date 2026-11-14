export function assertApiUrlAllowed(url: URL): void {
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  const devHostHttp = import.meta.env.DEV && url.protocol === "http:"
    && typeof window !== "undefined" && url.hostname === window.location.hostname;
  if (url.protocol !== "https:" && !localHttp && !devHostHttp) {
    throw new Error("API URL must use HTTPS");
  }
}
