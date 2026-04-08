declare module 'webm-writer' {
  export interface WebMWriterOptions {
    quality?: number;
    transparent?: boolean;
    alphaQuality?: number;
    frameDuration?: number;
    frameRate?: number;
  }

  export default class WebMWriter {
    constructor(options: WebMWriterOptions);
    addFrame(frame: HTMLCanvasElement, alpha?: HTMLCanvasElement | number, overrideFrameDuration?: number): void;
    complete(): Promise<Blob>;
  }
}
