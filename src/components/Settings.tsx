import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  ArrowLeft, 
  Upload, 
  Edit3, 
  Trash2, 
  Type,
  Plus,
  Files
} from 'lucide-react';
import { motion } from 'motion/react';

interface FontItem {
  id: string;
  name: string;
  fileName: string;
  category: 'Bengali' | 'English' | 'Arabic';
}

export function Settings({ onBack }: { onBack: () => void }) {
  const [fonts, setFonts] = useState<FontItem[]>([
    { id: '1', name: 'Bornomala-Regular.ttf', fileName: 'Bornomala-Regular.ttf', category: 'Bengali' }
  ]);

  const categories: FontItem['category'][] = ['Bengali', 'English', 'Arabic'];

  const deleteFont = (id: string) => {
    if (window.confirm('Are you sure you want to remove this font?')) {
      setFonts(prev => prev.filter(f => f.id !== id));
    }
  };

  const renameFont = (id: string, currentName: string) => {
    const newName = window.prompt('Enter new font name:', currentName);
    if (newName && newName.trim() !== '') {
      setFonts(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-slate-700" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Settings</h2>
        </div>
      </div>

      {/* Font Management Container */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 space-y-10 shadow-2xl shadow-slate-100/50">
        <div>
          <h3 className="text-lg font-black text-slate-800 mb-6">Custom Fonts</h3>
          
          {/* Upload Area */}
          <div className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/10 transition-all cursor-pointer group">
            <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <p className="text-slate-500 font-bold text-sm">Click to upload .ttf, .otf, .var font file</p>
          </div>
        </div>

        {/* Font Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((cat) => (
            <div key={cat} className="space-y-4">
              <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
                <h4 className="text-sm font-bold text-slate-700">{cat} Fonts</h4>
              </div>
              
              <div className="space-y-3">
                {fonts.filter(f => f.category === cat).map(font => (
                  <div 
                    key={font.id}
                    className="p-4 bg-white border border-slate-900 rounded-xl shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow"
                  >
                    <div className="overflow-hidden">
                      <p className="text-[11px] font-black text-slate-900 truncate">{font.name}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{font.fileName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => renameFont(font.id, font.name)}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => deleteFont(font.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {fonts.filter(f => f.category === cat).length === 0 && (
                  <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-300">
                    <Files className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Fonts Loaded</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Additional Settings Hint */}
      <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-indigo-200">
        <div className="flex items-center gap-6 text-center md:text-left">
          <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl">
            <Type className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight">Enterprise Labeling</h3>
            <p className="text-white/70 font-medium text-sm mt-1">Configure global typography settings for all PDF blueprints.</p>
          </div>
        </div>
        <button className="px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-105 transition-all">
          Update Global Styling
        </button>
      </div>
    </div>
  );
}
