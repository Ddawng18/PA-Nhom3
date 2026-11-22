export function safeHttps(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function embedVideo(value: string | null) {
  const href = safeHttps(value);
  if (!href) return undefined;
  const url = new URL(href);
  const hosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"];
  const videoId = url.hostname === "youtu.be"
    ? url.pathname.slice(1)
    : hosts.includes(url.hostname)
      ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)$/)?.[1]
      : undefined;
  if (videoId && /^[\w-]{11}$/.test(videoId)) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  if (url.hostname === "player.vimeo.com" && /^\/video\/\d+$/.test(url.pathname)) return url.href;
  if (url.hostname === "vimeo.com" && /^\/\d+$/.test(url.pathname)) return `https://player.vimeo.com/video${url.pathname}`;
  return undefined;
}
