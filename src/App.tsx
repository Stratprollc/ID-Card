import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Layout, 
  Settings2, 
  Plus, 
  Trash2, 
  Printer, 
  Info,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CardSet, PrintSettings, PageSize, LayoutMode, PrintContent } from './types';
import { generatePDF } from './lib/pdfGenerator';

const INITIAL_SET: CardSet = {
  id: crypto.randomUUID(),
  title: '',
  frontImage: null,
  backImage: null,
};

export default function App() {
  const [sets, setSets] = useState<CardSet[]>([{ ...INITIAL_SET }]);
  const [settings, setSettings] = useState<PrintSettings>({
    pageSize: 'A4',
    layoutMode: 'single',
    content: 'both',
    preset: 'side-by-side',
    fitMode: 'contain',
    colorMode: 'bw',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (setId: string, side: 'front' | 'back', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSets(prev => prev.map(s => s.id === setId ? { ...s, [`${side}Image`]: result } : s));
    };
    reader.readAsDataURL(file);
  };

  const addSet = () => {
    if (sets.length < 2) {
      setSets(prev => [...prev, { ...INITIAL_SET, id: crypto.randomUUID() }]);
      setSettings(prev => ({ ...prev, layoutMode: 'double', preset: 'grid' }));
    }
  };

  const removeSet = (id: string) => {
    if (sets.length > 1) {
      setSets(prev => prev.filter(s => s.id !== id));
      setSettings(prev => ({ ...prev, layoutMode: 'single', preset: 'side-by-side' }));
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      await generatePDF(sets, settings);
    } catch (error) {
      console.error('PDF Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isReady = sets.every(s => (settings.content === 'both' ? (s.frontImage && s.backImage) : (settings.content === 'front-only' ? s.frontImage : s.backImage)));

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">BD Card Print Pro</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setSets([{ ...INITIAL_SET, id: crypto.randomUUID() }]);
                setSettings({
                  pageSize: 'A4',
                  layoutMode: 'single',
                  content: 'both',
                  preset: 'side-by-side',
                  fitMode: 'contain',
                });
              }}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Reset
            </button>
            <button 
              onClick={handlePrint}
              disabled={!isReady || isGenerating}
              className={`flex items-center gap-2 px-5 py-2 font-medium transition-all ${
                isReady && !isGenerating 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Job Management */}
        <div className="lg:col-span-8 space-y-8">
          {/* Live Preview Section */}
          <section className="bg-white p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Layout Preview</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Layout className="w-3 h-3" />
                <span>Scaled to fit screen</span>
              </div>
            </div>
            <div className="flex justify-center bg-gray-50 p-6 border border-gray-100">
              <div 
                className="bg-white border border-gray-200 relative overflow-hidden"
                style={{ 
                  width: settings.pageSize === 'A4' ? '340px' : '400px', 
                  height: '240px',
                  transition: 'width 0.3s ease'
                }}
              >
                {/* Preview Cards */}
                <div className={`absolute inset-0 p-4 flex flex-row items-center ${settings.layoutMode === 'double' ? 'justify-around' : 'justify-end pr-[0.9in]'}`}>
                  {/* Left Half (Single Set) */}
                  <div className="flex flex-col gap-2 items-center">
                    <PreviewCard image={sets[0].frontImage} label="F1" fitMode={settings.fitMode} colorMode={settings.colorMode} />
                    <PreviewCard image={sets[0].backImage} label="B1" fitMode={settings.fitMode} colorMode={settings.colorMode} />
                  </div>

                  {/* Right Half (if double) */}
                  {settings.layoutMode === 'double' && (
                    <div className="flex flex-col gap-2 items-center">
                      <PreviewCard image={sets[1]?.frontImage} label="F2" fitMode={settings.fitMode} colorMode={settings.colorMode} />
                      <PreviewCard image={sets[1]?.backImage} label="B2" fitMode={settings.fitMode} colorMode={settings.colorMode} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Card Sets</h2>
              {sets.length < 2 && (
                <button 
                  onClick={addSet}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Second Card
                </button>
              )}
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {sets.map((set, index) => (
                  <motion.div 
                    key={set.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-8 border border-gray-100 relative group"
                  >
                    {sets.length > 1 && (
                      <button 
                        onClick={() => removeSet(set.id)}
                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}

                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <input 
                        type="text"
                        placeholder="Reference Name (e.g. John Doe ID)"
                        className="text-xl font-semibold bg-transparent border-none focus:ring-0 placeholder:text-gray-300 w-full"
                        value={set.title}
                        onChange={(e) => setSets(prev => prev.map(s => s.id === set.id ? { ...s, title: e.target.value } : s))}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Front Side */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Front Side</label>
                        <ImageUploader 
                          image={set.frontImage} 
                          onUpload={(file) => handleImageUpload(set.id, 'front', file)}
                          onClear={() => setSets(prev => prev.map(s => s.id === set.id ? { ...s, frontImage: null } : s))}
                          fitMode={settings.fitMode}
                          colorMode={settings.colorMode}
                        />
                      </div>

                      {/* Back Side */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Back Side</label>
                        <ImageUploader 
                          image={set.backImage} 
                          onUpload={(file) => handleImageUpload(set.id, 'back', file)}
                          onClear={() => setSets(prev => prev.map(s => s.id === set.id ? { ...s, backImage: null } : s))}
                          fitMode={settings.fitMode}
                          colorMode={settings.colorMode}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Print Instructions */}
          <section className="bg-blue-50/50 p-8 border border-blue-100">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white flex items-center justify-center shadow-sm">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Critical Print Instructions</h3>
                <ul className="space-y-2 text-blue-800/80 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Set <strong>Scale to 100%</strong> in your printer settings.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Disable <strong>"Fit to Page"</strong> or <strong>"Shrink to Fit"</strong>.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Use <strong>High Quality</strong> print mode for best results.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 border border-gray-100 sticky top-24">
            <div className="flex items-center gap-2 mb-8">
              <Settings2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold">Print Settings</h2>
            </div>

            <div className="space-y-8">
              {/* Page Size */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-600">Page Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['A4', 'Legal'] as PageSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSettings(prev => ({ ...prev, pageSize: size }))}
                      className={`py-3 px-4 text-sm font-medium transition-all border ${
                        settings.pageSize === size 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Mode */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-600">Layout Mode</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['single', 'double'] as LayoutMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        if (mode === 'double' && sets.length < 2) addSet();
                        setSettings(prev => ({ ...prev, layoutMode: mode }));
                      }}
                      className={`flex items-center justify-between py-3 px-4 text-sm font-medium transition-all border ${
                        settings.layoutMode === mode 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <span className="capitalize">{mode} Card Set</span>
                      <Layout className="w-4 h-4 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Preset */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-600">Layout Preset</label>
                <div className="grid grid-cols-1 gap-2">
                  {(settings.layoutMode === 'single' ? ['side-by-side', 'vertical-stack'] : ['side-by-side', 'grid']).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSettings(prev => ({ ...prev, preset: p as any }))}
                      className={`flex items-center justify-between py-3 px-4 text-sm font-medium transition-all border ${
                        settings.preset === p 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <span className="capitalize">{p.replace('-', ' ')}</span>
                      {p === 'grid' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
                {settings.preset === 'grid' && (
                  <p className="text-[10px] text-blue-600 font-medium px-1">
                    * Grid mode puts fronts on top and backs on bottom (like your image).
                  </p>
                )}
              </div>

              {/* Content Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-600">Include in PDF</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['both', 'front-only', 'back-only'] as PrintContent[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setSettings(prev => ({ ...prev, content: c }))}
                      className={`flex items-center justify-between py-3 px-4 text-sm font-medium transition-all border ${
                        settings.content === c 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <span className="capitalize">{c.replace('-', ' ')}</span>
                      <FileText className="w-4 h-4 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Mode */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-600">Print Color</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bw', label: 'B&W', desc: 'Photocopy look' },
                    { id: 'color', label: 'Color', desc: 'Original colors' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSettings(prev => ({ ...prev, colorMode: c.id as any }))}
                      className={`flex flex-col items-start py-3 px-4 text-sm font-medium transition-all border ${
                        settings.colorMode === c.id 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className="text-[10px] opacity-50">{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Fitting */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-600">Image Scaling</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'fill', label: 'Fill Card', desc: 'Stretch to fit' },
                    { id: 'contain', label: 'Fit Inside', desc: 'Keep aspect' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSettings(prev => ({ ...prev, fitMode: f.id as any }))}
                      className={`flex flex-col items-start py-3 px-4 text-sm font-medium transition-all border ${
                        settings.fitMode === f.id 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="text-[10px] opacity-50">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PreviewCard({ image, label, fitMode, colorMode }: { image: string | null, label: string, fitMode: string, colorMode: string }) {
  return (
    <div className={`w-[100px] h-[63px] flex items-center justify-center overflow-hidden relative ${!image ? 'bg-gray-100 border border-gray-200' : ''}`}>
      {image ? (
        <img 
          src={image} 
          className={`w-full h-full ${colorMode === 'bw' ? 'grayscale contrast-125' : ''} ${fitMode === 'fill' ? 'object-fill' : 'object-contain'}`} 
        />
      ) : (
        <span className="text-[10px] font-bold text-gray-400">{label}</span>
      )}
    </div>
  );
}

function ImageUploader({ image, onUpload, onClear, fitMode, colorMode }: { 
  image: string | null, 
  onUpload: (file: File) => void, 
  onClear: () => void,
  fitMode: string,
  colorMode: string
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div 
      onClick={() => !image && inputRef.current?.click()}
      className={`relative aspect-[3.375/2.125] border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-3 cursor-pointer ${
        image 
          ? 'border-transparent' 
          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-blue-300'
      }`}
    >
      <input 
        type="file" 
        ref={inputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} 
      />
      
      {image ? (
        <>
          <img 
            src={image} 
            alt="Preview" 
            className={`w-full h-full ${fitMode === 'fill' ? 'object-fill' : 'object-contain'} ${colorMode === 'bw' ? 'grayscale contrast-125' : ''}`} 
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="p-2 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-gray-400">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-600">Click to upload</p>
            <p className="text-xs text-gray-400">or drag and drop</p>
          </div>
        </>
      )}
    </div>
  );
}
