declare module "gifenc" {
  type Pixels = Uint8Array | Uint8ClampedArray;
  export function quantize(data: Pixels, colors: number): number[][];
  export function applyPalette(data: Pixels, palette: number[][]): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(indexes: Uint8Array, width: number, height: number, options: {
      palette: number[][];
      delay: number;
      repeat: number;
      transparent: boolean;
      transparentIndex: number;
      dispose: number;
    }): void;
    finish(): void;
    bytes(): Uint8Array;
  };
}
