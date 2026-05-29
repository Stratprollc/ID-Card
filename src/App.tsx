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
  Calendar,
  RefreshCw,
  ChevronRight,
  Calculator,
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
  const [activeTab, setActiveTab] = useState<'card-print' | 'age-calculator'>('card-print');
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
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 sticky top-0 h-screen flex flex-col z-50">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Print Pro</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('card-print')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'card-print' 
                ? 'bg-blue-50 text-blue-600 rounded-xl' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl'
            }`}
          >
            <Layout className="w-4 h-4" />
            Card Print
          </button>
          <button 
            onClick={() => setActiveTab('age-calculator')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'age-calculator' 
                ? 'bg-blue-50 text-blue-600 rounded-xl' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Age Calculator
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">User</p>
              <p className="text-[10px] text-gray-400 truncate">stratproamz@gmail.com</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {activeTab === 'card-print' ? 'BD Card Print Pro' : 'Age Calculator'}
            </h2>
            <div className="flex items-center gap-4">
              {activeTab === 'card-print' && (
                <>
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
                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm' 
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
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'card-print' ? (
              <motion.div
                key="card-print"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10"
              >
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
      </motion.div>
        ) : (
          <AgeCalculator />
        )}
      </AnimatePresence>
    </main>
  </div>
</div>
  );
}

function AgeCalculator() {
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [age, setAge] = useState<{ years: number; months: number; days: number } | null>(null);
  const [nextBirthdayDays, setNextBirthdayDays] = useState<number | null>(null);

  const calculateAge = () => {
    if (!day || !month || !year) return;

    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    if (isNaN(d) || isNaN(m) || isNaN(y)) return;

    const today = new Date();
    const dob = new Date(y, m - 1, d);

    if (dob > today) {
      alert('Date of birth cannot be in the future');
      return;
    }

    // Age calculation
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    setAge({ years, months, days });

    // Next Birthday calculation
    const nextBirthday = new Date(today.getFullYear(), m - 1, d);
    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setNextBirthdayDays(diffDays === 365 || diffDays === 366 ? 0 : diffDays);
  };

  const handleReset = () => {
    setDay('');
    setMonth('');
    setYear('');
    setAge(null);
    setNextBirthdayDays(null);
  };

  return (
    <motion.div 
      key="age-calculator"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto px-6 py-12 space-y-10"
    >
      {/* Page Header */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-blue-600 flex items-center justify-center rounded-2xl shadow-xl shadow-blue-200">
          <Calendar className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Age Calculator</h2>
          <p className="text-lg text-slate-400 font-bold -mt-1">বয়স ক্যালকুলেটর</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Card */}
        <div className="lg:col-span-5 bg-white p-10 border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[2.5rem]">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide mb-8 leading-tight">
            জন্ম তারিখ নির্বাচন করুন (DATE OF BIRTH)
          </h3>

          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DAY (দিন)</label>
                <input 
                  type="text" 
                  placeholder="DD"
                  maxLength={2}
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-xl font-black text-slate-700 text-center"
                  value={day}
                  onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MONTH (মাস)</label>
                <input 
                  type="text" 
                  placeholder="MM"
                  maxLength={2}
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-xl font-black text-slate-700 text-center"
                  value={month}
                  onChange={(e) => setMonth(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">YEAR (বছর)</label>
                <input 
                  type="text" 
                  placeholder="YYYY"
                  maxLength={4}
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-xl font-black text-slate-700 text-center"
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={calculateAge}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-200"
              >
                <Calculator className="w-5 h-5" />
                CALCULATE
              </button>
              <button 
                onClick={handleReset}
                className="w-16 h-16 bg-slate-100 hover:bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center transition-all hover:rotate-180 duration-500"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="lg:col-span-7 bg-white p-10 border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] relative overflow-hidden">
          {/* Decorative Background Element */}
          <div className="absolute top-10 right-10 opacity-[0.03] select-none">
            <Calculator className="w-32 h-32" />
          </div>

          <h3 className="text-lg font-black text-blue-600 uppercase tracking-widest mb-10 leading-tight">
            আপনার বর্তমান বয়স (YOUR CURRENT AGE)
          </h3>

          <div className="space-y-8">
            <AnimatePresence mode="wait">
              {age ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-8 rounded-3xl text-center border border-slate-100 transition-all hover:border-blue-200 group">
                      <p className="text-5xl font-black mb-2 text-slate-800 group-hover:text-blue-600 transition-colors">{age.years}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-400 transition-colors">YEARS (বছর)</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-3xl text-center border border-slate-100 transition-all hover:border-blue-200 group">
                      <p className="text-5xl font-black mb-2 text-slate-800 group-hover:text-blue-600 transition-colors">{age.months}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-400 transition-colors">MONTHS (মাস)</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-3xl text-center border border-slate-100 transition-all hover:border-blue-200 group">
                      <p className="text-5xl font-black mb-2 text-slate-800 group-hover:text-blue-600 transition-colors">{age.days}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-400 transition-colors">DAYS (দিন)</p>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 flex items-center gap-6">
                    <div className="w-14 h-14 bg-white flex items-center justify-center rounded-2xl shadow-sm border border-blue-100">
                      <Calendar className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">পরবর্তী জন্মদিন (NEXT BIRTHDAY)</p>
                      <p className="text-lg font-black text-blue-900">
                        {nextBirthdayDays === 0 
                          ? 'আজ আপনার জন্মদিন! শুভ জন্মদিন!' 
                          : `${nextBirthdayDays} দিন পর আপনার পরবর্তী জন্মদিন।`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center gap-6 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Info className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold max-w-[280px]">আপনার জন্ম তারিখ দিন এবং ক্যালকুলেট বাটনে ক্লিক করুন</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-[#12161f] p-12 rounded-[2.5rem] relative overflow-hidden group">
        {/* Matrix/Grid Background Effect */}
        <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(circle_at_1px_1px,#3b82f6_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-12">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-blue-600 w-fit rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">SYSTEM INFORMATION</p>
            </div>
            <h4 className="text-4xl font-black text-white leading-tight">নির্ভুল বয়স গণনা পদ্ধতি</h4>
            <p className="text-slate-400 font-medium leading-loose text-lg max-w-2xl">
              এই সিস্টেমটি বর্তমান তারিখের সাথে আপনার দেওয়া জন্ম তারিখের ব্যবধান বের করে নির্ভুলভাবে আপনার বয়স গণনা করে। 
              এটি লিপ ইয়ার এবং মাসসমূহের দিনের পার্থক্যও বিবেচনা করে।
            </p>
          </div>

          <div className="lg:w-1/3 space-y-4 pt-10">
            {[
              'নির্ভুল ফলাফল',
              'সহজ ব্যবহার',
              'পরবর্তী জন্মদিনের তথ্য'
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 group/item">
                <div className="w-6 h-6 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-blue-500 transform group-hover/item:translate-x-1 transition-transform" />
                </div>
                <p className="text-slate-100 font-black text-sm uppercase tracking-widest">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
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
