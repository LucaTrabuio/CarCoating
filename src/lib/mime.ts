/** MIME-type lookup for image uploads (CSV/ZIP imports + admin upload). */
export const IMAGE_MIME_FROM_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function imageMimeFromFilename(name: string): string {
  const m = name.match(/\.([a-z0-9]+)$/i);
  const ext = m ? m[1].toLowerCase() : 'jpg';
  return IMAGE_MIME_FROM_EXT[ext] || 'image/jpeg';
}

export function imageExtFromFilename(name: string): string | null {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}
