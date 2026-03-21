/**
 * Compresses image files to base64 data URLs for direct DB storage.
 * Non-image files (PDF etc.) are converted to base64 as-is.
 */

const MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5MB after base64

export async function compressAndConvertToBase64(file: File): Promise<string> {
  // Non-image files: convert directly
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result.length > MAX_BASE64_SIZE) {
          reject(new Error(`Файл "${file.name}" слишком большой для сохранения (макс. ~4 МБ для не-изображений)`));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error(`Не удалось прочитать файл "${file.name}"`));
      reader.readAsDataURL(file);
    });
  }

  // Image files: compress via Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const maxWidth = 1200;
      const maxHeight = 1200;
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context error'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try quality levels until under size limit
      const tryQuality = (quality: number) => {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > MAX_BASE64_SIZE && quality > 0.3) {
          tryQuality(quality - 0.15);
        } else if (dataUrl.length > MAX_BASE64_SIZE) {
          reject(new Error(`Изображение "${file.name}" слишком большое даже после сжатия`));
        } else {
          resolve(dataUrl);
        }
      };

      tryQuality(0.7);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Не удалось загрузить изображение "${file.name}"`));
    };

    img.src = url;
  });
}
