
import * as jpeg from 'jpeg-js';

/**
 * Compresses an image to reduce file size for Cloudflare R2 free tier optimization
 * @param buffer - Image buffer (JPEG or PNG)
 * @param mimeType - MIME type of the image
 * @param maxWidth - Maximum width for resizing (default 1920px)
 * @param quality - JPEG quality (0-100, default 80)
 * @returns Compressed image buffer
 */
export async function compressImage(
  buffer: Buffer,
  mimeType: string,
  maxWidth = 1920,
  quality = 80
): Promise<Buffer> {
  // Only compress JPEG and PNG images
  if (!['image/jpeg', 'image/png'].includes(mimeType)) {
    return buffer;
  }

  try {
    if (mimeType === 'image/jpeg') {
      // Decode JPEG
      const rawImage = jpeg.decode(buffer, { useTArray: true });

      // Resize if needed
      const { width: originalWidth, height: originalHeight, data } = rawImage;
      if (originalWidth > maxWidth) {
        // TODO: Implement actual resizing in future
      }

      // Encode back to JPEG with lower quality
      const compressed = jpeg.encode({
        data: data as Uint8Array,
        width: originalWidth,
        height: originalHeight,
      }, quality);

      // Return compressed buffer if it's smaller, otherwise original
      return compressed.data.length < buffer.length 
        ? Buffer.from(compressed.data) 
        : buffer;
    }

    if (mimeType === 'image/png') {
      // For PNGs, we'll just use the original for now (pngjs compression is minimal)
      // In a real production environment, you could use a better PNG compressor
      return buffer;
    }

    return buffer;
  } catch (error) {
    console.error('Image compression failed, using original:', error);
    return buffer;
  }
}
