import { getFontEmbedCSS } from 'html-to-image';
import html2canvas from 'html2canvas';

const DEFAULT_CAPTURE_SCALE = 2;
const IMAGE_REQUEST_INIT: RequestInit = {
  mode: 'cors',
  credentials: 'omit',
};

interface CaptureAnimatedNodeFrameOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  fontEmbedCSS?: string;
  scale?: number;
  foreignObjectRendering?: boolean;
}

interface SaveFileWritableLike {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

export interface SaveFileHandleLike {
  createWritable(): Promise<SaveFileWritableLike>;
}

type FilePickerWindow = Window & typeof globalThis & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    excludeAcceptAllOption?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandleLike>;
};

export async function getEmbeddedFontCss(node: HTMLElement): Promise<string | undefined> {
  try {
    return await getFontEmbedCSS(node, {
      preferredFontFormat: 'woff2',
      fetchRequestInit: IMAGE_REQUEST_INIT,
    });
  } catch {
    return undefined;
  }
}

function freezeAnimatedStyles(originalRoot: HTMLElement, clonedRoot: HTMLElement) {
  const originalElements = [originalRoot, ...Array.from(originalRoot.querySelectorAll<HTMLElement>('*'))];
  const clonedElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*'))];
  const total = Math.min(originalElements.length, clonedElements.length);

  for (let i = 0; i < total; i += 1) {
    const source = originalElements[i];
    const target = clonedElements[i];
    const ownerWindow = source.ownerDocument.defaultView ?? window;
    const computed = ownerWindow.getComputedStyle(source);

    target.style.animation = 'none';
    target.style.animationPlayState = 'paused';
    target.style.transition = 'none';
    target.style.caretColor = 'transparent';
    target.style.opacity = computed.opacity;
    target.style.transform = computed.transform === 'none' ? 'none' : computed.transform;
    target.style.transformOrigin = computed.transformOrigin;
    target.style.filter = computed.filter;
    target.style.clipPath = computed.clipPath;
    target.style.setProperty('-webkit-clip-path', computed.getPropertyValue('-webkit-clip-path') || computed.clipPath);
    target.style.visibility = computed.visibility;
    target.style.mixBlendMode = computed.mixBlendMode;
    target.style.background = computed.background;
    target.style.backgroundColor = computed.backgroundColor;
    target.style.backgroundImage = computed.backgroundImage;
    target.style.backgroundSize = computed.backgroundSize;
    target.style.backgroundPosition = computed.backgroundPosition;
    target.style.backgroundRepeat = computed.backgroundRepeat;
    target.style.backgroundBlendMode = computed.backgroundBlendMode;
    target.style.backdropFilter = computed.backdropFilter;
    target.style.setProperty('-webkit-backdrop-filter', computed.getPropertyValue('-webkit-backdrop-filter') || computed.backdropFilter);
    target.style.maskImage = computed.maskImage;
    target.style.setProperty('-webkit-mask-image', computed.getPropertyValue('-webkit-mask-image') || computed.maskImage);
    target.style.color = computed.color;
    target.style.textShadow = computed.textShadow;
    target.style.letterSpacing = computed.letterSpacing;
  }
}

export async function captureAnimatedNodeFrame(
  node: HTMLElement,
  options: CaptureAnimatedNodeFrameOptions,
): Promise<HTMLCanvasElement> {
  const scale = Math.max(1, Math.min(options.scale ?? DEFAULT_CAPTURE_SCALE, 3));

  return await html2canvas(node, {
    width: options.width,
    height: options.height,
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: options.backgroundColor ?? null,
    logging: false,
    imageTimeout: 30000,
    foreignObjectRendering: options.foreignObjectRendering ?? false,
    onclone: (clonedDoc) => {
      if (options.fontEmbedCSS) {
        const style = clonedDoc.createElement('style');
        style.textContent = options.fontEmbedCSS;
        clonedDoc.head.appendChild(style);
      }

      clonedDoc.documentElement.style.width = `${options.width}px`;
      clonedDoc.documentElement.style.height = `${options.height}px`;
      clonedDoc.documentElement.style.margin = '0';
      clonedDoc.documentElement.style.background = options.backgroundColor ?? 'transparent';
      clonedDoc.body.style.width = `${options.width}px`;
      clonedDoc.body.style.height = `${options.height}px`;
      clonedDoc.body.style.margin = '0';
      clonedDoc.body.style.background = options.backgroundColor ?? 'transparent';
      clonedDoc.body.style.overflow = 'hidden';

      clonedDoc.querySelectorAll('img').forEach((img) => {
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.loading = 'eager';
        img.decoding = 'sync';
      });

      const clonedNode = clonedDoc.body.firstElementChild as HTMLElement | null;
      if (clonedNode) {
        clonedNode.style.width = `${options.width}px`;
        clonedNode.style.height = `${options.height}px`;
        clonedNode.style.margin = '0';
        clonedNode.style.transform = 'none';
        clonedNode.style.transformOrigin = 'top left';
        freezeAnimatedStyles(node, clonedNode);
      }
    },
  });
}

export async function createVideoSaveTarget(filename: string): Promise<SaveFileHandleLike | null> {
  const pickerWindow = window as FilePickerWindow;
  if (!pickerWindow.showSaveFilePicker) return null;

  try {
    return await pickerWindow.showSaveFilePicker({
      suggestedName: filename,
      excludeAcceptAllOption: false,
      types: [
        {
          description: 'Vídeo WebM',
          accept: {
            'video/webm': ['.webm'],
          },
        },
      ],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }

    throw error;
  }
}

export async function writeBlobToVideoFile(fileHandle: SaveFileHandleLike, blob: Blob): Promise<void> {
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
