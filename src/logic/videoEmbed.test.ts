import { describe, expect, it } from "vitest";
import { embedVideo, safeHttps } from "./videoEmbed";

describe("video embedding", () => {
  it("embeds standard and live YouTube links", () => {
    expect(embedVideo("https://www.youtube.com/watch?v=VuPhNXsVR50")).toBe("https://www.youtube-nocookie.com/embed/VuPhNXsVR50");
    expect(embedVideo("https://youtu.be/VuPhNXsVR50")).toBe("https://www.youtube-nocookie.com/embed/VuPhNXsVR50");
    expect(embedVideo("https://www.youtube.com/shorts/VuPhNXsVR50")).toBe("https://www.youtube-nocookie.com/embed/VuPhNXsVR50");
    expect(embedVideo("https://www.youtube.com/live/VuPhNXsVR50")).toBe("https://www.youtube-nocookie.com/embed/VuPhNXsVR50");
    expect(embedVideo("https://www.youtube.com/embed/VuPhNXsVR50")).toBe("https://www.youtube-nocookie.com/embed/VuPhNXsVR50");
  });

  it("embeds Vimeo and rejects unsafe links", () => {
    expect(embedVideo("https://vimeo.com/12345")).toBe("https://player.vimeo.com/video/12345");
    expect(embedVideo("https://player.vimeo.com/video/12345")).toBe("https://player.vimeo.com/video/12345");
    expect(embedVideo("http://www.youtube.com/watch?v=VuPhNXsVR50")).toBeUndefined();
    expect(embedVideo("javascript:alert(1)")).toBeUndefined();
    expect(embedVideo(null)).toBeUndefined();
    expect(safeHttps("https://example.com/video.mp4")).toBe("https://example.com/video.mp4");
  });
});
