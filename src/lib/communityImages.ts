// Resize locally: no paid image processing service and smaller storage/egress.
export async function prepareCommunityImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể xử lý ảnh. Vui lòng thử ảnh khác.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.6, 0.4]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= 512 * 1024) return new File([blob], "community.webp", { type: blob.type });
    }
    throw new Error("Ảnh còn quá lớn sau khi nén. Vui lòng chọn ảnh nhỏ hơn.");
  } finally { bitmap.close(); }
}
