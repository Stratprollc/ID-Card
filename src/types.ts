export type PageSize = 'A4' | 'Legal';
export type LayoutMode = 'single' | 'double';
export type PrintContent = 'both' | 'front-only' | 'back-only';
export type LayoutPreset = 'side-by-side' | 'grid' | 'vertical-stack';
export type FitMode = 'contain' | 'fill';
export type ColorMode = 'bw' | 'color';

export interface CardSet {
  id: string;
  title: string;
  frontImage: string | null;
  backImage: string | null;
  selected?: boolean;
}

export interface PrintSettings {
  pageSize: PageSize;
  layoutMode: LayoutMode;
  content: PrintContent;
  preset: LayoutPreset;
  fitMode: FitMode;
  colorMode: ColorMode;
  sharpenLevel: number; // 0 to 1
  contrastLevel: number; // 1 to 2
  brightnessLevel: number; // 0.5 to 1.5
  saturationLevel: number; // 0 to 2
  gammaLevel: number; // 0.5 to 2.5
}

export interface PrintTemplate {
  id: string;
  name: string;
  description: string;
  settings: Partial<PrintSettings>;
}
