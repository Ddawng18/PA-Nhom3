import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { MOTION_FRAME_DELAY } from "./studio";

export function encodeStudioGif(frames: ImageData[], transparent: boolean, delay = MOTION_FRAME_DELAY): Blob {
  const gif = GIFEncoder();
  for (const { data, width, height } of frames) {
    // Reserve one palette entry for transparent pixels rather than mapping
    // transparent black and opaque black to the same GIF index.
    const colors = quantize(data, transparent ? 255 : 256);
    const indexes = applyPalette(data, colors);
    if (transparent) {
      colors.unshift([0, 0, 0]);
      for (let i = 0; i < indexes.length; i++) {
        indexes[i] = data[4 * i + 3] < 128 ? 0 : indexes[i] + 1;
      }
    }
    gif.writeFrame(indexes, width, height, {
      palette: colors,
      delay,
      repeat: 0,
      transparent,
      transparentIndex: 0,
      dispose: transparent ? 2 : 1,
    });
  }
  gif.finish();
  return new Blob([Uint8Array.from(gif.bytes())], { type: "image/gif" });
}
