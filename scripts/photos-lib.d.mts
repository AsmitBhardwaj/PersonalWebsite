export const FULL_EDGE: number;
export const THUMB_EDGE: number;
export const PLACEHOLDER_PREFIX: string;
export interface BuiltPhoto { id: string; file: string; src: string; thumb: string; width: number; height: number; caption?: string; date?: string; place?: string; }
export function assertNoMetadata(file: string): Promise<void>;
export function buildPhotos(options: { srcDir: string; outDir: string; manifestPath: string; publicBase?: string; log?: (line: string) => void }): Promise<BuiltPhoto[]>;
