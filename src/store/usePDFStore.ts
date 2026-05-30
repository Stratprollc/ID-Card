import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Overlay {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  content: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  opacity: number;
  rotation: number;
  width: number;
  height: number;
  alignment: 'left' | 'center' | 'right';
  zIndex: number;
  language: 'en' | 'bn' | 'ar';
}

export interface FontData {
  id: string;
  name: string;
  url: string;
  category: 'Bengali' | 'English' | 'Arabic';
}

interface PDFEditorState {
  pdfUrl: string | null;
  numPages: number;
  currentPage: number;
  zoom: number;
  overlays: Overlay[];
  fonts: FontData[];
  selectedOverlayId: string | null;
  editorMode: 'select' | 'text';
  history: Overlay[][];
  historyIndex: number;

  setPdfUrl: (url: string | null) => void;
  setNumPages: (num: number) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setEditorMode: (mode: 'select' | 'text') => void;
  addOverlay: (overlay: Omit<Overlay, 'id'>) => void;
  updateOverlay: (id: string, updates: Partial<Overlay>) => void;
  deleteOverlay: (id: string) => void;
  selectOverlay: (id: string | null) => void;
  addFont: (font: FontData) => void;
  
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
}

export const usePDFStore = create<PDFEditorState>()(
  persist(
    (set, get) => ({
      pdfUrl: null,
      numPages: 0,
      currentPage: 1,
      zoom: 1.0,
      overlays: [],
      fonts: [],
      selectedOverlayId: null,
      editorMode: 'select',
      history: [[]],
      historyIndex: 0,

      setPdfUrl: (url) => set({ pdfUrl: url, overlays: [], history: [[]], historyIndex: 0 }),
      setEditorMode: (mode) => set({ editorMode: mode }),
      setNumPages: (num) => set({ numPages: num }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setZoom: (zoom) => set({ zoom }),
      
      addOverlay: (overlayData) => {
        const id = Math.random().toString(36).substring(7);
        const newOverlay = { ...overlayData, id };
        set((state) => {
          const newOverlays = [...state.overlays, newOverlay];
          return { overlays: newOverlays, selectedOverlayId: id };
        });
        get().saveHistory();
      },

      updateOverlay: (id, updates) => {
        set((state) => ({
          overlays: state.overlays.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        }));
        get().saveHistory();
      },

      deleteOverlay: (id) => {
        set((state) => ({
          overlays: state.overlays.filter((o) => o.id !== id),
          selectedOverlayId: state.selectedOverlayId === id ? null : state.selectedOverlayId,
        }));
        get().saveHistory();
      },

      selectOverlay: (id) => set({ selectedOverlayId: id }),
      
      addFont: (font) => set((state) => ({ fonts: [...state.fonts, font] })),

      saveHistory: () => {
        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push([...state.overlays]);
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      undo: () => {
        set((state) => {
          if (state.historyIndex > 0) {
            const nextIndex = state.historyIndex - 1;
            return {
              overlays: [...state.history[nextIndex]],
              historyIndex: nextIndex,
            };
          }
          return state;
        });
      },

      redo: () => {
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            const nextIndex = state.historyIndex + 1;
            return {
              overlays: [...state.history[nextIndex]],
              historyIndex: nextIndex,
            };
          }
          return state;
        });
      },
    }),
    {
      name: 'pdf-editor-storage',
      partialize: (state) => ({ fonts: state.fonts }), // Only persist fonts
    }
  )
);
