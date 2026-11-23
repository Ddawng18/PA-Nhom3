export type PageMeta = {
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article";
};

const defaultImage = "/linea-studies-1200.jpg";
const defaultDescription = "LINEA - lộ trình học vẽ, luyện tập và nhận phản hồi dành cho người mới bắt đầu.";

function setNamedMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", url);
}

export function absoluteAssetUrl(value: string | null | undefined) {
  if (!value) return `${window.location.origin}${defaultImage}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${window.location.origin}${value.startsWith("/") ? value : `/${value}`}`;
}

export function setPageMeta({ title, description, image, type = "website" }: PageMeta) {
  if (typeof document === "undefined") return;
  const safeDescription = description.trim().slice(0, 180) || defaultDescription;
  const pageUrl = `${window.location.origin}${window.location.pathname}`;
  const imageUrl = absoluteAssetUrl(image || defaultImage);

  document.title = title;
  setNamedMeta("name", "description", safeDescription);
  setNamedMeta("property", "og:type", type);
  setNamedMeta("property", "og:title", title);
  setNamedMeta("property", "og:description", safeDescription);
  setNamedMeta("property", "og:url", pageUrl);
  setNamedMeta("property", "og:image", imageUrl);
  setNamedMeta("property", "og:image:alt", title);
  setNamedMeta("name", "twitter:card", "summary_large_image");
  setNamedMeta("name", "twitter:title", title);
  setNamedMeta("name", "twitter:description", safeDescription);
  setNamedMeta("name", "twitter:image", imageUrl);
  setCanonical(pageUrl);
}
