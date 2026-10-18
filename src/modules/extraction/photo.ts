// Local browser preprocessing only: preserve the original file and strip metadata from the uploaded copy.
export async function photoJpeg(file: Blob) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("format");
  if (file.size > 20971520) throw Error("size");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 20971520) throw Error("size");
    const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw Error("format");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.72, 0.58]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= 2097152) return blob;
    }
    throw Error("size");
  } finally {
    bitmap.close();
  }
}
