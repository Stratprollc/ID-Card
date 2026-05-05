import React, { useState, useRef, useEffect } from 'react';
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
  User,
  Fingerprint,
  Zap,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CardSet, PrintSettings, PageSize, LayoutMode, PrintContent, PrintTemplate } from './types';
import { generatePDF } from './lib/pdfGenerator';

const INITIAL_SET: CardSet = {
  id: crypto.randomUUID(),
  title: '',
  frontImage: null,
  backImage: null,
  selected: true,
};

const PRINT_TEMPLATES: PrintTemplate[] = [
  {
    id: 'photocopy-std',
    name: 'Standard Photocopy',
    description: 'B&W, high contrast, A4 side-by-side. Best for official submissions.',
    settings: {
      colorMode: 'bw',
      contrastLevel: 1.45,
      sharpenLevel: 0.6,
      brightnessLevel: 1.05,
      gammaLevel: 0.9,
      pageSize: 'A4',
      preset: 'side-by-side'
    }
  },
  {
    id: 'color-pro',
    name: 'Color Professional',
    description: 'Natural colors with subtle sharpening. Best for high-quality IDs.',
    settings: {
      colorMode: 'color',
      contrastLevel: 1.15,
      sharpenLevel: 0.3,
      brightnessLevel: 1.0,
      saturationLevel: 1.1,
      gammaLevel: 1.0,
      pageSize: 'A4',
      preset: 'side-by-side'
    }
  },
  {
    id: 'clean-scan',
    name: 'Clean Digital Scan',
    description: 'Bright and clear, removes grey backgrounds. Great for archival.',
    settings: {
      colorMode: 'color',
      contrastLevel: 1.3,
      sharpenLevel: 0.4,
      brightnessLevel: 1.2,
      gammaLevel: 1.4,
      pageSize: 'A4'
    }
  },
  {
    id: 'legal-grid',
    name: 'Legal Grid (2 Card)',
    description: 'Compact grid layout on Legal paper. Best for multiple cards.',
    settings: {
      pageSize: 'Legal',
      layoutMode: 'double',
      preset: 'grid',
      colorMode: 'bw'
    }
  }
];

export default function App() {
  const [sets, setSets] = useState<CardSet[]>([{ ...INITIAL_SET }]);
  const [settings, setSettings] = useState<PrintSettings>({
    pageSize: 'A4',
    layoutMode: 'single',
    content: 'both',
    preset: 'side-by-side',
    fitMode: 'contain',
    colorMode: 'bw',
    sharpenLevel: 0.5,
    contrastLevel: 1.25,
    brightnessLevel: 1.0,
    saturationLevel: 1.0,
    gammaLevel: 1.0,
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
    setSets(prev => [...prev, { ...INITIAL_SET, id: crypto.randomUUID() }]);
    if (sets.length === 1) {
      setSettings(prev => ({ ...prev, layoutMode: 'double', preset: 'grid' }));
    }
  };

  const removeSet = (id: string) => {
    if (sets.length > 1) {
      const newSets = sets.filter(s => s.id !== id);
      setSets(newSets);
      if (newSets.length === 1) {
        setSettings(prev => ({ ...prev, layoutMode: 'single', preset: 'side-by-side' }));
      }
    }
  };

  const handlePrint = async () => {
    const selectedSets = sets.filter(s => s.selected);
    if (selectedSets.length === 0) return;
    
    setIsGenerating(true);
    try {
      await generatePDF(selectedSets, settings);
    } catch (error) {
      console.error('PDF Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isReady = sets.some(s => s.selected) && sets.filter(s => s.selected).every(s => (settings.content === 'both' ? (s.frontImage && s.backImage) : (settings.content === 'front-only' ? s.frontImage : s.backImage)));

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
                  colorMode: 'bw',
                  sharpenLevel: 0.5,
                  contrastLevel: 1.25,
                  brightnessLevel: 1.0,
                  saturationLevel: 1.0,
                  gammaLevel: 1.0,
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
              {isGenerating ? 'Generating...' : `Download PDF (${sets.filter(s => s.selected).length} Sets)`}
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
                    <PreviewCard image={sets[0].frontImage} label="F1" settings={settings} />
                    <PreviewCard image={sets[0].backImage} label="B1" settings={settings} />
                  </div>

                  {/* Right Half (if double) */}
                  {settings.layoutMode === 'double' && (
                    <div className="flex flex-col gap-2 items-center">
                      <PreviewCard image={sets[1]?.frontImage} label="F2" settings={settings} />
                      <PreviewCard image={sets[1]?.backImage} label="B2" settings={settings} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Hidden SVG Filter for Gamma Correction Preview */}
          <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
            <filter id="gamma-preview">
              <feComponentTransfer>
                <feFuncR type="gamma" exponent={1 / settings.gammaLevel} />
                <feFuncG type="gamma" exponent={1 / settings.gammaLevel} />
                <feFuncB type="gamma" exponent={1 / settings.gammaLevel} />
              </feComponentTransfer>
            </filter>
          </svg>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Card Sets</h2>
              <div className="flex gap-4">
                {sets.length > 1 && (
                  <button 
                    onClick={() => {
                      const allSelected = sets.every(s => s.selected);
                      setSets(prev => prev.map(s => ({ ...s, selected: !allSelected })));
                    }}
                    className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    {sets.every(s => s.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                <button 
                  onClick={addSet}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New Card
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {sets.map((set, index) => (
                  <motion.div 
                    key={set.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white p-8 border transition-all relative group ${set.selected ? 'border-blue-200 ring-1 ring-blue-100 shadow-md' : 'border-gray-100 opacity-60'}`}
                  >
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                      <button
                        onClick={() => setSets(prev => prev.map(s => s.id === set.id ? { ...s, selected: !s.selected } : s))}
                        className={`p-2 rounded-lg transition-all ${set.selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      {sets.length > 1 && (
                        <button 
                          onClick={() => removeSet(set.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                      <div className={`w-10 h-10 flex items-center justify-center font-bold transition-colors ${set.selected ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
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
                          side="front"
                          image={set.frontImage} 
                          onUpload={(file) => handleImageUpload(set.id, 'front', file)}
                          onClear={() => setSets(prev => prev.map(s => s.id === set.id ? { ...s, frontImage: null } : s))}
                          settings={settings}
                        />
                      </div>

                      {/* Back Side */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Back Side</label>
                        <ImageUploader 
                          side="back"
                          image={set.backImage} 
                          onUpload={(file) => handleImageUpload(set.id, 'back', file)}
                          onClear={() => setSets(prev => prev.map(s => s.id === set.id ? { ...s, backImage: null } : s))}
                          settings={settings}
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
              {/* Template Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <label>Quick Presets</label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {PRINT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSettings(prev => ({ ...prev, ...template.settings }))}
                      className="group flex flex-col items-start p-3 text-left transition-all bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{template.name}</span>
                      <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{template.description}</span>
                    </button>
                  ))}
                </div>
              </div>
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

              {/* Image Enhancement Controls */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Enhancement</h3>
                  <button 
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      sharpenLevel: 0.5,
                      contrastLevel: 1.25,
                      brightnessLevel: 1.0,
                      saturationLevel: 1.0,
                      gammaLevel: 1.0,
                    }))}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                  >
                    Reset
                  </button>
                </div>

                {/* Enhancement Live Preview */}
                <div className="relative aspect-[3.375/2.125] w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src="https://picsum.photos/seed/idcard/600/400" 
                    alt="Enhancement Preview"
                    className="w-full h-full object-cover"
                    style={{
                      filter: `
                        ${settings.colorMode === 'bw' ? 'grayscale(100%)' : ''}
                        contrast(${settings.contrastLevel})
                        brightness(${settings.brightnessLevel})
                        saturate(${settings.colorMode === 'bw' ? 0 : settings.saturationLevel})
                        url(#gamma-preview)
                      `.trim()
                    }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[8px] font-bold text-white uppercase tracking-widest">
                    Live Preview
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-500">Contrast</label>
                    <span className="text-xs font-mono text-blue-600">{(settings.contrastLevel * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="2" 
                    step="0.05" 
                    value={settings.contrastLevel}
                    onChange={(e) => setSettings(prev => ({ ...prev, contrastLevel: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-500">Sharpening</label>
                    <span className="text-xs font-mono text-blue-600">{(settings.sharpenLevel * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={settings.sharpenLevel}
                    onChange={(e) => setSettings(prev => ({ ...prev, sharpenLevel: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-500">Brightness</label>
                    <span className="text-xs font-mono text-blue-600">{(settings.brightnessLevel * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.05" 
                    value={settings.brightnessLevel}
                    onChange={(e) => setSettings(prev => ({ ...prev, brightnessLevel: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-500">Saturation</label>
                    <span className="text-xs font-mono text-blue-600">{(settings.saturationLevel * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="2" 
                    step="0.1" 
                    value={settings.saturationLevel}
                    onChange={(e) => setSettings(prev => ({ ...prev, saturationLevel: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-500">Gamma</label>
                    <span className="text-xs font-mono text-blue-600">{settings.gammaLevel.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.5" 
                    step="0.1" 
                    value={settings.gammaLevel}
                    onChange={(e) => setSettings(prev => ({ ...prev, gammaLevel: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PreviewCard({ image, label, settings }: { image: string | null, label: string, settings: PrintSettings }) {
  const filterStyle = {
    filter: `
      ${settings.colorMode === 'bw' ? 'grayscale(100%)' : ''}
      contrast(${settings.contrastLevel})
      brightness(${settings.brightnessLevel})
      saturate(${settings.colorMode === 'bw' ? 0 : settings.saturationLevel})
      url(#gamma-preview)
    `.trim()
  };

  return (
    <div className={`w-[100px] h-[63px] flex items-center justify-center overflow-hidden relative ${!image ? 'bg-gray-100 border border-gray-200' : ''}`}>
      {image ? (
        <img 
          src={image} 
          style={filterStyle}
          className={`w-full h-full ${settings.fitMode === 'fill' ? 'object-fill' : 'object-contain'}`} 
        />
      ) : (
        <span className="text-[10px] font-bold text-gray-400">{label}</span>
      )}
    </div>
  );
}

function ImageUploader({ image, onUpload, onClear, settings, side }: { 
  image: string | null, 
  onUpload: (file: File) => void, 
  onClear: () => void,
  settings: PrintSettings,
  side: 'front' | 'back'
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (image) setIsLoading(false);
  }, [image]);

  const filterStyle = {
    filter: `
      ${settings.colorMode === 'bw' ? 'grayscale(100%)' : ''}
      contrast(${settings.contrastLevel})
      brightness(${settings.brightnessLevel})
      saturate(${settings.colorMode === 'bw' ? 0 : settings.saturationLevel})
      url(#gamma-preview)
    `.trim()
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!isLoading && e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setIsLoading(true);
        onUpload(file);
      }
    }
  };

  return (
    <motion.div 
      onClick={() => !image && !isLoading && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={isDragging ? { 
        scale: 1.02, 
        backgroundColor: 'rgba(239, 246, 255, 1)',
        borderColor: 'rgb(59, 130, 246)'
      } : { 
        scale: 1, 
        backgroundColor: image ? 'transparent' : 'rgba(249, 250, 251, 1)',
        borderColor: image ? 'transparent' : 'rgb(229, 231, 235)'
      }}
      className={`relative aspect-[3.375/2.125] border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center gap-3 cursor-pointer ${
        image && !isDragging
          ? 'border-transparent shadow-sm' 
          : isDragging
            ? 'shadow-xl border-solid ring-4 ring-blue-500/10'
            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-blue-300'
      }`}
    >
      <input 
        type="file" 
        ref={inputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setIsLoading(true);
            onUpload(file);
          }
        }} 
      />
      
      {isLoading ? (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-blue-600 tracking-tight">Processing Image</p>
            <p className="text-[10px] text-blue-400 uppercase tracking-widest font-medium animate-pulse">Please wait...</p>
          </div>
        </div>
      ) : null}

      {image && (
        <>
          <img 
            src={image} 
            alt="Preview" 
            style={filterStyle}
            className={`w-full h-full transition-opacity duration-300 ${isDragging ? 'opacity-30 blur-sm' : 'opacity-100'} ${settings.fitMode === 'fill' ? 'object-fill' : 'object-contain'}`} 
          />
          {!isDragging && !isLoading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="p-2 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform shadow-lg"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {(!image || isDragging) && (
        <div className={`flex flex-col items-center gap-3 ${image ? 'absolute inset-0 z-10' : ''}`}>
          <div className="relative">
            <motion.div 
              animate={isDragging ? { 
                y: [0, -8, 0],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border transition-colors ${
                isDragging ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-gray-100 text-gray-400'
              }`}
            >
              <Upload className="w-6 h-6" />
            </motion.div>
            {!image && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                {side === 'front' ? <User className="w-3.5 h-3.5" /> : <Fingerprint className="w-3.5 h-3.5" />}
              </div>
            )}
          </div>
          <div className="text-center">
            <p className={`text-sm font-bold transition-colors ${isDragging ? 'text-blue-700' : 'text-gray-600'}`}>
              {isDragging ? 'Release to Upload' : `Upload ${side.toUpperCase()} SIDE`}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Click or drag & drop</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
