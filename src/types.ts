export type PageSize = 'A4' | 'Legal';
export type LayoutMode = 'single' | 'double';
export type PrintContent = 'both' | 'front-only' | 'back-only';
export type LayoutPreset = 'side-by-side' | 'grid' | 'vertical-stack';

export interface CardSet {
  id: string;
  title: string;
  frontImage: string | null;
  backImage: string | null;
}

export interface PrintSettings {
  pageSize: PageSize;
  layoutMode: LayoutMode;
  content: PrintContent;
  preset: LayoutPreset;
  showCutLines: boolean;
}
