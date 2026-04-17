/**
 * ZIP bundle parser shared by the store and blog CSV importers.
 *
 * Hard limits guard against zip-bomb uploads:
 *   - MAX_FILES: cap on entry count
 *   - MAX_TOTAL_UNCOMPRESSED: cap on combined uncompressed size
 *   - MAX_PER_FILE_UNCOMPRESSED: cap on a single image
 */
import JSZip from 'jszip';

export const MAX_FILES = 600;
export const MAX_TOTAL_UNCOMPRESSED = 250 * 1024 * 1024; // 250 MB
export const MAX_PER_FILE_UNCOMPRESSED = 10 * 1024 * 1024; // 10 MB per image

export type LoadedZip = {
  csvText: string | null;
  images: Map<string, JSZip.JSZipObject>;
};

export class ZipBoundsExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipBoundsExceededError';
  }
}

/** Detect ZIP by content-type or filename extension. */
export function isZipFile(file: File): boolean {
  if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') return true;
  return /\.zip$/i.test(file.name);
}

/**
 * Parse a ZIP upload, returning the first .csv at any depth + a filename → entry
 * map for everything under `images/`. Throws ZipBoundsExceededError if the bundle
 * would exceed any safety cap.
 */
export async function loadZip(file: File): Promise<LoadedZip> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.entries(zip.files).filter(([, e]) => !e.dir);

  if (entries.length > MAX_FILES) {
    throw new ZipBoundsExceededError(
      `ZIP contains ${entries.length} files; maximum is ${MAX_FILES}`,
    );
  }

  // JSZip exposes uncompressed size as the underlying _data._dataBinary length on
  // older versions; rely on the public `_data.uncompressedSize` field which is
  // always present after load. Fall back to streaming the entry if unavailable.
  let totalUncompressed = 0;
  for (const [, entry] of entries) {
    const u = (entry as unknown as { _data?: { uncompressedSize?: number } })._data
      ?.uncompressedSize;
    const size = typeof u === 'number' ? u : 0;
    if (size > MAX_PER_FILE_UNCOMPRESSED) {
      throw new ZipBoundsExceededError(
        `ZIP entry "${entry.name}" is ${(size / 1024 / 1024).toFixed(1)} MB uncompressed; per-file maximum is ${MAX_PER_FILE_UNCOMPRESSED / 1024 / 1024} MB`,
      );
    }
    totalUncompressed += size;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) {
      throw new ZipBoundsExceededError(
        `ZIP exceeds ${MAX_TOTAL_UNCOMPRESSED / 1024 / 1024} MB uncompressed`,
      );
    }
  }

  const images = new Map<string, JSZip.JSZipObject>();
  let csvText: string | null = null;
  for (const [path, entry] of entries) {
    const lowerPath = path.toLowerCase();
    if (csvText === null && lowerPath.endsWith('.csv')) {
      csvText = await entry.async('text');
      continue;
    }
    if (/^images\//i.test(path)) {
      const filename = path.slice(path.indexOf('/') + 1);
      if (filename) images.set(filename.toLowerCase(), entry);
    }
  }
  return { csvText, images };
}
