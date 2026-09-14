/**
 * Ambient types for archived hashing deps. These packages are not installed
 * unless you re-enable perceptual matching; this file keeps `tsc` green.
 */

declare module "imghash" {
  export function hash(
    data: Buffer | string,
    bits?: number
  ): Promise<string> | string;
}

declare module "hamming-distance" {
  export default function hammingDistance(
    a: Buffer | string,
    b: Buffer | string
  ): number;
}

declare module "sharp" {
  interface SharpInstance {
    resize(
      width: number,
      height: number,
      options?: { fit?: "cover" | "contain" | "fill" | "inside" | "outside" }
    ): SharpInstance;
    normalize(): SharpInstance;
    toBuffer(): Promise<Buffer>;
  }

  export default function sharp(input: Buffer): SharpInstance;
}
