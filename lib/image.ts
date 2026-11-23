import exifr from "exifr";

export type PhotoMeta = {
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  exif: Record<string, unknown> | null;
};

const KEEP = ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "Make", "Model", "LensModel", "FocalLength", "ExposureTime", "FNumber", "ISO", "latitude", "longitude", "GPSAltitude"];

export async function readMeta(file: File): Promise<PhotoMeta> {
  try {
    // Parse everything (exifr only derives latitude/longitude when the raw GPS tags are present).
    const data = await exifr.parse(file, { gps: true, tiff: true, exif: true });
    if (!data) return { takenAt: null, latitude: null, longitude: null, exif: null };
    const when: Date | undefined = data.DateTimeOriginal ?? data.CreateDate;
    const lat = typeof data.latitude === "number" ? data.latitude : null;
    const lng = typeof data.longitude === "number" ? data.longitude : null;
    const exif: Record<string, unknown> = {};
    for (const k of KEEP) {
      const v = data[k];
      if (v !== undefined) exif[k] = v instanceof Date ? v.toISOString() : v;
    }
    return {
      takenAt: when instanceof Date && !isNaN(when.getTime()) ? when.toISOString() : null,
      latitude: lat,
      longitude: lng,
      exif,
    };
  } catch {
    return { takenAt: null, latitude: null, longitude: null, exif: null };
  }
}

/** Make a small JPEG for the gallery. Returns null if the browser can't decode the file (e.g. HEIC on some browsers). */
export async function makeThumbnail(file: File, maxSize = 640): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8));
  } catch {
    return null;
  }
}
