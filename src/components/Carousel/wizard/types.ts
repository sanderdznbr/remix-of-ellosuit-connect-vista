export const FLOW_COLOR = '#007DE3';

export interface ReferenceImage {
  url: string;
  thumb: string;
  label: string;
  source: 'upload' | 'web';
  category: 'face' | 'style' | 'general' | 'product' | 'brand';
  personId?: string; // links face photo to a specific FacePerson
}

export interface FacePerson {
  id: string;
  label: string; // "Pessoa 1", "Pessoa 2"...
  photos: ReferenceImage[];
  gender: 'male' | 'female' | 'auto';
  wearsGlasses: boolean;
}

export interface ImageSettings {
  model: 'gemini' | 'nano-banana' | 'higgsfield' | 'auto';
  higgsFieldModel: string;
  fidelity: 'high' | 'balanced' | 'creative';
  negativePrompt: string;
  bodyPosition: string;
  handObject: string;
  phoneScreen: string;
  screenImageUrl: string;
  imageType: 'photo' | 'illustration' | 'print' | '3d-render' | 'cinematic';
  lightingStyle: 'cinematic' | 'natural' | 'studio' | 'dramatic' | 'soft' | 'neon';
  cameraAngle: 'front' | 'side' | 'low-angle' | 'high-angle' | 'close-up' | 'full-body';
  generationMode: 'direct' | 'cloud';
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
  facePersons: FacePerson[];
  allPeopleOnCover: boolean;
  famousList: FamousPerson[];
  famousImages: { username: string; images: any[] }[];
  imageSettings: ImageSettings;
  faceGender: 'male' | 'female' | 'auto';
  wearsGlasses: boolean;
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
  higgsFieldModel: 'higgsfield-ai/soul/standard',
  fidelity: 'balanced',
  negativePrompt: '',
  bodyPosition: '',
  handObject: '',
  phoneScreen: '',
  screenImageUrl: '',
  imageType: 'photo',
  lightingStyle: 'cinematic',
  cameraAngle: 'front',
  generationMode: 'direct',
};
