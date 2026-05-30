import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Settings2, 
  Layout, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  FileDown,
  Maximize2,
  Minimize2,
  Layers,
  PenTool,
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Type,
  RotateCcw,
  RotateCw,
  Copy,
  Move,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Undo2,
  Redo2,
  Save,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { usePDFStore, Overlay, FontData } from '../store/usePDFStore';
import { exportPDF } from '../lib/pdfExporter';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export function PDFEdit() {
  const {
    pdfUrl, setPdfUrl,
    numPages, setNumPages,
    currentPage, setCurrentPage,
    zoom, setZoom,
    editorMode, setEditorMode,
    overlays, addOverlay, updateOverlay, deleteOverlay,
    selectedOverlayId, selectOverlay,
    fonts, addFont,
    undo, redo
  } = usePDFStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadPDF(file);
  };

  const loadPDF = async (file: File) => {
    setIsUploading(true);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    try {
      const loadingTask = pdfjsLib.getDocument({ url });
      const pdf = await loadingTask.promise;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading PDF:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.ttf')) return;

    const url = URL.createObjectURL(file);
    const newFont: FontData = {
      id: Math.random().toString(36).substring(7),
      name: file.name.replace('.ttf', ''),
      url,
      category: 'English' 
    };
    addFont(newFont);
  };

  const handleExport = async () => {
    if (!pdfUrl) return;
    setIsExporting(true);
    try {
      const response = await fetch(pdfUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdfBytes = await exportPDF(arrayBuffer, overlays, fonts);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `overlay_export_${Date.now()}.pdf`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only add if in text mode and clicking outside an existing overlay
    if (editorMode !== 'text' || !pdfUrl) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    addOverlay({
      pageNumber: currentPage,
      x,
      y,
      content: 'Click to edit...',
      fontSize: 20 / zoom,
      color: '#000000',
      fontFamily: 'Inter',
      opacity: 1,
      rotation: 0,
      width: 200,
      height: 40,
      alignment: 'left',
      zIndex: overlays.length + 1,
      language: 'en'
    });
  };

  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-slate-50 overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100/50"
          >
            <Upload className="w-4 h-4" />
            Import PDF
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          
          <div className="h-4 w-[1px] bg-slate-200 mx-2" />
          
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <ToolbarButton 
              active={editorMode === 'select'} 
              onClick={() => setEditorMode('select')} 
              icon={<Move className="w-4 h-4" />} 
              label="Select" 
            />
            <ToolbarButton 
              active={editorMode === 'text'} 
              onClick={() => setEditorMode('text')} 
              icon={<Type className="w-4 h-4" />} 
              label="Add Text" 
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={undo} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-indigo-600"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-indigo-600"><Redo2 className="w-4 h-4" /></button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500"><ZoomOut className="w-4 h-4" /></button>
            <span className="px-3 text-[10px] font-black text-slate-400 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500"><ZoomIn className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {numPages > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-white rounded-lg disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest px-2">Page {currentPage} of {numPages}</span>
              <button 
                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage === numPages}
                className="p-1 hover:bg-white rounded-lg disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button 
            onClick={handleExport}
            disabled={!pdfUrl || isExporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Project
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-white border-r border-slate-100 flex flex-col z-30 shrink-0 shadow-lg">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thumbnails</h3>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">{numPages} Pages</span>
            </div>
            
            <div className="space-y-4 max-h-[40vh] overflow-y-auto px-1 custom-scrollbar">
              {!pdfUrl && !isUploading && (
                <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                  <FileText className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-center">Empty</p>
                </div>
              )}
              {pdfUrl && (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                    <ThumbnailItem 
                      key={page} 
                      page={page} 
                      pdfUrl={pdfUrl!} 
                      active={currentPage === page} 
                      onClick={() => setCurrentPage(page)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Font Library</h3>
              <button 
                onClick={() => fontInputRef.current?.click()}
                className="p-1 px-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
              <input ref={fontInputRef} type="file" accept=".ttf" className="hidden" onChange={handleFontUpload} />
            </div>
            
            <div className="space-y-2">
              <FontItem name="System Inter" active={!selectedOverlay?.fontFamily || selectedOverlay.fontFamily === 'Inter'} />
              {fonts.map(font => (
                <FontItem 
                  key={font.id} 
                  name={font.name} 
                  active={selectedOverlay?.fontFamily === font.name} 
                  onDelete={() => {}} // Add delete logic
                />
              ))}
            </div>
          </div>
        </div>

        {/* Center: Main Editor */}
        <div 
          className="flex-1 bg-slate-100 overflow-auto p-12 flex justify-center items-start relative scroll-smooth"
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file && file.type === 'application/pdf') loadPDF(file);
          }}
        >
          <AnimatePresence>
            {!pdfUrl && !isUploading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 z-10"
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-48 h-64 bg-white rounded-[2rem] shadow-2xl flex flex-col items-center justify-center mb-6 cursor-pointer border-2 border-dashed transition-all ${isDraggingOver ? 'border-indigo-500 bg-indigo-50/50 scale-105' : 'border-slate-100 hover:border-indigo-300'}`}
                >
                  <Upload className={`w-12 h-12 transition-colors ${isDraggingOver ? 'text-indigo-500' : 'text-slate-200'}`} />
                  <p className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-[0.2em]">Drop PDF Here</p>
                </div>
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Architectural Studio</h3>
                <p className="text-sm font-bold text-slate-400/60 mt-2">Professional Multilingual Overlay System</p>
              </motion.div>
            )}
            {isUploading && (
              <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md z-50">
                <div className="w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-900 animate-pulse">Analyzing Structure...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {pdfUrl && (
            <div 
              id="pdf-canvas-container"
              ref={containerRef}
              className={`relative bg-white transform-gpu origin-top transition-transform duration-200 ${editorMode === 'text' ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ 
                transform: `scale(${zoom})`,
                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.1), 0 30px 60px -30px rgba(0,0,0,0.15)'
              }}
              onClick={handleCanvasClick}
            >
              <PDFPageRenderer pdfUrl={pdfUrl} pageNumber={currentPage} scale={2} />
              
              {/* Overlay Layer */}
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                {overlays
                  .filter(o => o.pageNumber === currentPage)
                  .map(overlay => (
                    <OverlayItem 
                      key={overlay.id} 
                      overlay={overlay} 
                      isSelected={selectedOverlayId === overlay.id}
                      zoom={zoom}
                      onSelect={() => selectOverlay(overlay.id)}
                      onUpdate={(updates) => updateOverlay(overlay.id, updates)}
                      onDelete={() => deleteOverlay(overlay.id)}
                    />
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Properties */}
        <div className="w-80 bg-white border-l border-slate-100 flex flex-col z-30 shrink-0 shadow-xl overflow-y-auto custom-scrollbar">
          <div className="p-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Overlay Manifest</h3>
            
            <AnimatePresence mode="wait">
              {selectedOverlay ? (
                <motion.div
                  key={selectedOverlay.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       Text Content
                    </label>
                    <textarea 
                      value={selectedOverlay.content}
                      onChange={(e) => updateOverlay(selectedOverlay.id, { content: e.target.value })}
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-indigo-900 focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none h-40 leading-relaxed"
                      placeholder="Input content here..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <PropertyInput label="Font Size" icon={<Type className="w-3 h-3" />}>
                      <input 
                        type="number" 
                        value={Math.round(selectedOverlay.fontSize)}
                        onChange={(e) => updateOverlay(selectedOverlay.id, { fontSize: parseInt(e.target.value) })}
                        className="w-full bg-transparent text-xs font-black outline-none"
                      />
                    </PropertyInput>
                    
                    <PropertyInput label="Logic" icon={<ChevronRight className="w-3 h-3" />}>
                      <select 
                         value={selectedOverlay.language}
                         onChange={(e) => updateOverlay(selectedOverlay.id, { language: e.target.value as any })}
                         className="w-full bg-transparent text-xs font-black outline-none appearance-none cursor-pointer"
                      >
                        <option value="en">English</option>
                        <option value="bn">Bengali</option>
                        <option value="ar">Arabic (RTL)</option>
                      </select>
                    </PropertyInput>
                  </div>

                  <PropertyInput label="Typography Blueprint" icon={<PenTool className="w-3 h-3" />}>
                    <select 
                       value={selectedOverlay.fontFamily}
                       onChange={(e) => updateOverlay(selectedOverlay.id, { fontFamily: e.target.value })}
                       className="w-full bg-transparent text-xs font-black outline-none appearance-none cursor-pointer"
                    >
                      <option value="Inter">System High-Precision</option>
                      {fonts.map(font => (
                        <option key={font.id} value={font.name}>{font.name}</option>
                      ))}
                    </select>
                  </PropertyInput>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <AlignmentBtn 
                      active={selectedOverlay.alignment === 'left'} 
                      onClick={() => updateOverlay(selectedOverlay.id, { alignment: 'left' })}
                      icon={<AlignLeft className="w-4 h-4" />}
                    />
                    <AlignmentBtn 
                      active={selectedOverlay.alignment === 'center'} 
                      onClick={() => updateOverlay(selectedOverlay.id, { alignment: 'center' })}
                      icon={<AlignCenter className="w-4 h-4" />}
                    />
                    <AlignmentBtn 
                      active={selectedOverlay.alignment === 'right'} 
                      onClick={() => updateOverlay(selectedOverlay.id, { alignment: 'right' })}
                      icon={<AlignRight className="w-4 h-4" />}
                    />
                  </div>

                  <div className="space-y-6">
                    <SliderInput 
                      label="Global Opacity" 
                      value={selectedOverlay.opacity} 
                      onChange={(v) => updateOverlay(selectedOverlay.id, { opacity: v })} 
                      min={0} max={1} step={0.01} 
                      displayValue={`${Math.round(selectedOverlay.opacity * 100)}%`}
                    />
                    
                    <SliderInput 
                      label="Axial Rotation" 
                      value={selectedOverlay.rotation} 
                      onChange={(v) => updateOverlay(selectedOverlay.id, { rotation: v })} 
                      min={0} max={360} step={1} 
                      displayValue={`${selectedOverlay.rotation}°`}
                    />
                    
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hex Code</span>
                        <span className="text-[10px] font-black text-slate-800 uppercase">{selectedOverlay.color}</span>
                      </div>
                      <input 
                        type="color" 
                        value={selectedOverlay.color}
                        onChange={(e) => updateOverlay(selectedOverlay.id, { color: e.target.value })}
                        className="w-12 h-12 rounded-xl overflow-hidden p-0 border-4 border-white shadow-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex gap-3">
                    <button 
                      onClick={() => {
                        const nextZ = Math.max(...overlays.map(o => o.zIndex), 0) + 1;
                        const { id: _, ...rest } = selectedOverlay;
                        addOverlay({ ...rest, x: selectedOverlay.x + 2, y: selectedOverlay.y + 2, zIndex: nextZ });
                      }}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> Clone
                    </button>
                    <button 
                      onClick={() => deleteOverlay(selectedOverlay.id)}
                      className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Purge
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center text-slate-200 space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-slate-100">
                    <PenTool className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-center max-w-[150px] leading-loose">Initialize an element to unlock architecture controls</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

// Sub-components with refined styling
function ToolbarButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
        active ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AlignmentBtn({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-lg flex items-center justify-center transition-all ${active ? 'bg-white text-indigo-600 shadow-sm shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {icon}
    </button>
  );
}

interface ThumbnailItemProps {
  key?: number | string;
  page: number;
  pdfUrl: string;
  active: boolean;
  onClick: () => void;
}

function ThumbnailItem({ page, pdfUrl, active, onClick }: ThumbnailItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderThumb = async () => {
      if (!canvasRef.current) return;
      const doc = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
      const p = await doc.getPage(page);
      const viewport = p.getViewport({ scale: 0.2 });
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.height = viewport.height;
        canvasRef.current.width = viewport.width;
        await p.render({ canvasContext: context, viewport, canvasFactory: null } as any).promise;
      }
    };
    renderThumb();
  }, [page, pdfUrl]);

  return (
    <button 
      onClick={onClick}
      className={`w-full aspect-[1/1.4] rounded-xl border-2 transition-all p-1 bg-white relative overflow-hidden group ${
        active ? 'border-indigo-600 ring-4 ring-indigo-500/10' : 'border-slate-100 hover:border-indigo-200 shadow-sm'
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />
      <div className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[8px] font-black ${active ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white opacity-40'}`}>
        {page}
      </div>
    </button>
  );
}

interface FontItemProps {
  key?: string;
  name: string;
  active: boolean;
  onDelete?: () => void;
}

function FontItem({ name, active, onDelete }: FontItemProps) {
  return (
    <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${active ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-50' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-indigo-600' : 'bg-slate-100'}`}>
          <Type className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
        </div>
        <span className={`text-[10px] font-black ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{name}</span>
      </div>
      {onDelete && <X className="w-3.5 h-3.5 text-slate-300 hover:text-red-500 cursor-pointer transition-colors" onClick={onDelete} />}
    </div>
  );
}

function PropertyInput({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        {icon} {label}
      </label>
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-indigo-500/50 transition-all">
        {children}
      </div>
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step, displayValue }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <span className="text-[10px] font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-full">{displayValue}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 transition-all"
      />
    </div>
  );
}

interface OverlayItemProps {
  key?: string;
  overlay: Overlay;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (u: any) => void;
  onDelete: () => void;
}

function PDFPageRenderer({ pdfUrl, pageNumber, scale }: { pdfUrl: string, pageNumber: number, scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const render = async () => {
      if (!canvasRef.current || !pdfUrl) return;
      const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport, canvasFactory: null } as any).promise;
    };
    render();
  }, [pdfUrl, pageNumber, scale]);

  return <canvas ref={canvasRef} className="max-w-full block shadow-2xl" />;
}

function OverlayItem({ overlay, isSelected, zoom, onSelect, onUpdate, onDelete }: OverlayItemProps & { zoom: number }) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { x: overlay.x, y: overlay.y };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const canvas = document.getElementById('pdf-canvas-container');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      
      // Calculate delta adjusted for zoom
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100;

      onUpdate({
        x: Math.min(Math.max(0, startPos.x + dx), 100),
        y: Math.min(Math.max(0, startPos.y + dy), 100)
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div 
      onMouseDown={onMouseDown}
      className={`absolute cursor-move select-none p-4 rounded-xl border-2 transition-all group pointer-events-auto origin-center transform-gpu ${
        isSelected ? 'border-indigo-600 bg-indigo-500/5 shadow-2xl z-[1000] ring-8 ring-indigo-500/5' : 'border-dashed border-indigo-200/40 hover:border-indigo-400/50 z-10'
      }`}
      style={{ 
        left: `${overlay.x}%`, 
        top: `${overlay.y}%`, 
        transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
        opacity: overlay.opacity,
        color: overlay.color,
        fontSize: `${overlay.fontSize}px`,
        fontFamily: overlay.fontFamily,
        textAlign: overlay.alignment,
        width: overlay.width,
        direction: overlay.language === 'ar' ? 'rtl' : 'ltr',
        zIndex: isSelected ? 9999 : overlay.zIndex,
      }}
    >
      <div className={`whitespace-pre-wrap break-words leading-tight ${overlay.language === 'ar' ? 'font-arabic' : ''}`}>
        {overlay.content || '...'}
      </div>
      
      {isSelected && (
        <>
          {/* Resize handles or info could go here */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-2xl z-[10001]">
            <span className="text-[8px] font-black text-white uppercase tracking-widest whitespace-nowrap">Active Overlay</span>
            <div className="w-[1px] h-3 bg-white/20" />
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest whitespace-nowrap">Layer #{overlay.zIndex}</span>
          </div>
        </>
      )}
    </div>
  );
}

