const MAX_WIDTH = 1600;
const BLUR_WIDTH = 24;
const OPTIMIZABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface OptimizedImage {
  file: File;
  width?: number;
  height?: number;
  placeholder?: string;
}

function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function optimizeImage(file: File): Promise<OptimizedImage> {
  if (!OPTIMIZABLE_TYPES.has(file.type)) return { file };

  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await loadImage(file);
    const sourceWidth = image instanceof ImageBitmap ? image.width : image.naturalWidth;
    const sourceHeight = image instanceof ImageBitmap ? image.height : image.naturalHeight;
    const shouldReencode = file.type !== "image/webp" || sourceWidth > MAX_WIDTH;
    const width = Math.min(sourceWidth, MAX_WIDTH);
    const height = Math.max(1, Math.round(sourceHeight * (width / sourceWidth)));

    const placeholderCanvas = document.createElement("canvas");
    placeholderCanvas.width = BLUR_WIDTH;
    placeholderCanvas.height = Math.max(1, Math.round(sourceHeight * (BLUR_WIDTH / sourceWidth)));
    const placeholderContext = placeholderCanvas.getContext("2d");
    if (!placeholderContext) return { file, width: sourceWidth, height: sourceHeight };
    placeholderContext.drawImage(image, 0, 0, placeholderCanvas.width, placeholderCanvas.height);
    const placeholderBlob = await canvasBlob(placeholderCanvas, "image/webp", 0.75) ?? await canvasBlob(placeholderCanvas, "image/jpeg", 0.8);
    const placeholder = placeholderBlob ? await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(placeholderBlob);
    }) : undefined;

    if (!shouldReencode) {
      if (image instanceof ImageBitmap) image.close();
      return { file, width, height, placeholder: placeholder || undefined };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { file, width: sourceWidth, height: sourceHeight, placeholder: placeholder || undefined };
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasBlob(canvas, "image/webp", 0.85);
    if (image instanceof ImageBitmap) image.close();
    if (!blob) return { file, width: sourceWidth, height: sourceHeight, placeholder: placeholder || undefined };
    return { file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp", lastModified: file.lastModified }), width, height, placeholder: placeholder || undefined };
  } catch {
    return { file };
  }
}
