declare module "g-i-s" {
  export interface GisImage {
    url: string;
    width: number;
    height: number;
    type: string;
    thumbnail?: { url: string; width: number; height: number };
  }

  export default function gis(
    query: string,
    cb: (error: Error | null, results: GisImage[]) => void
  ): void;
}
