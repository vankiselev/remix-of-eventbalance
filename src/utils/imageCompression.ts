/**
 * Image compression utility using Canvas API
 * Compresses images to JPEG with adaptive quality
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

/**
 * Compresses an image file or blob to reduce file size
 * @param file - The image file or blob to compress
 * @param options - Compression options
 * @returns Promise<Blob> - Compressed image as blob
 */
export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Use high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels if needed
      const tryCompress = (currentQuality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // If still too large and quality can be reduced
            if (blob.size > maxSizeBytes && currentQuality > 0.3) {
              tryCompress(currentQuality - 0.15);
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          currentQuality
        );
      };

      tryCompress(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Creates a cropped circular image from a source image
 * @param file - Source image file or blob
 * @param cropData - Crop parameters (x, y offsets, scale, rotation)
 * @param outputSize - Size of the output square image
 * @returns Promise<Blob> - Cropped image as blob
 */
export async function cropCircularImage(
  file: File | Blob,
  cropData: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  },
  outputSize: number = 400
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Enable high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Create circular clip
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Calculate the scaled dimensions
      const scaledWidth = img.width * cropData.scale;
      const scaledHeight = img.height * cropData.scale;

      // Move to center, apply rotation, then draw
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((cropData.rotation * Math.PI) / 180);
      
      // Draw the image centered with offset
      ctx.drawImage(
        img,
        -scaledWidth / 2 + cropData.x,
        -scaledHeight / 2 + cropData.y,
        scaledWidth,
        scaledHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to crop image'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
