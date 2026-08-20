// Resizes + recompresses an image file entirely client-side (Canvas API)
// before it ever reaches Supabase Storage, so a multi-MB phone photo becomes
// a ~20-50KB WebP — keeps avatar storage/bandwidth negligible on free tier.
export function compressImage(file, { maxSize = 320, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Không thể xử lý ảnh'))),
        'image/webp',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc tệp ảnh'));
    };
    img.src = objectUrl;
  });
}
