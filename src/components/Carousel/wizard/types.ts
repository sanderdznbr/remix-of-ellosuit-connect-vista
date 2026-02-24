export const FLOW_COLOR = '#007DE3';

export interface ReferenceImage {
  url: string;
  thumb: string;
  label: string;
  source: 'upload' | 'web';
  category: 'face' | 'style' | 'general';
}

export interface ImageSettings {
  model: 'gemini' | 'nano-banana';
  fidelity: 'high' | 'balanced' | 'creative'; // how closely to match references
  negativePrompt: string;
  bodyPosition: string;
  handObject: string;
  phoneScreen: string;
  imageType: 'photo' | 'illustration' | 'print' | '3d-render' | 'cinematic';
  lightingStyle: 'cinematic' | 'natural' | 'studio' | 'dramatic' | 'soft' | 'neon';
  cameraAngle: 'front' | 'side' | 'low-angle' | 'high-angle' | 'close-up' | 'full-body';
}

export interface FamousPerson {
  username: string;
  name: string;
  avatar: string;
  is_verified: boolean;
  followers: number;
}

export interface WizardData {
  topic: string;
  keywords: string;
  cardCount: number;
  imageCardCount: number;
  referenceImages: ReferenceImage[];
  famousList: FamousPerson[];
  famousImages: { username: string; images: any[] }[];
  imageSettings: ImageSettings;
  // Style
  bgColor: string;
  accentColor: string;
  textColor: string;
  selectedFont: number;
  brandName: string;
  userName: string;
  dateLabel: string;
}

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  model: 'nano-banana',
  fidelity: 'balanced',
  negativePrompt: '',
  bodyPosition: '',
  handObject: '',
  phoneScreen: '',
  imageType: 'photo',
  lightingStyle: 'cinematic',
  cameraAngle: 'front',
};
