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
    foreignObjectRendering: true,
    onclone: (clonedDoc) => {
      if (options.fontEmbedCSS) {
        const style = clonedDoc.createElement('style');
        style.textContent = options.fontEmbedCSS;
        clonedDoc.head.appendChild(style);
      }

      clonedDoc.querySelectorAll('img').forEach((img) => {
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.loading = 'eager';
      });

      const clonedNode = clonedDoc.body.firstElementChild as HTMLElement | null;
      if (clonedNode) {
        clonedNode.style.width = `${options.width}px`;
        clonedNode.style.height = `${options.height}px`;
        clonedNode.style.margin = '0';
        clonedNode.style.transform = 'none';
        clonedNode.style.transformOrigin = 'top left';
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