import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Save, Edit2, Check, AlertCircle, Scan, User, MapPin, Phone, FileText, Camera, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NIDInfo } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { DIVISIONS, LOCATION_DATA } from '../data/location';

export function NIDScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<NIDInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<NIDInfo[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, 'nids'),
      where('createdBy', '==', auth.currentUser.email),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NIDInfo[];
      setRecentScans(scans);
    });

    return () => unsubscribe();
  }, []);

  const cropPhoto = async (imageUrl: string, box: number[]): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Gemini normalized coordinates are [ymin, xmin, ymax, xmax] (0-1000)
        const [ymin, xmin, ymax, xmax] = box;
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        const left = (xmin / 1000) * width;
        const top = (ymin / 1000) * height;
        const sWidth = ((xmax - xmin) / 1000) * width;
        const sHeight = ((ymax - ymin) / 1000) * height;

        canvas.width = sWidth;
        canvas.height = sHeight;

        ctx.drawImage(img, left, top, sWidth, sHeight, 0, 0, sWidth, sHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'card' | 'person') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (type === 'card') {
          setImage(result);
          setExtractedData(null);
          setSuccess(false);
          setError(null);
        } else {
          setPersonImage(result);
          if (extractedData) {
            setExtractedData({ ...extractedData, pictureUrl: result });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const scanNID = async () => {
    if (!image) return;
    setIsScanning(true);
    setError(null);
    try {
      const response = await fetch('/api/scan-nid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed');
      }
      
      // Attempt to extract portrait if coordinates are provided
      let finalPersonImage = personImage;
      if (data.photoCropBox && Array.isArray(data.photoCropBox) && data.photoCropBox.length === 4) {
        try {
          const cropped = await cropPhoto(image, data.photoCropBox);
          if (cropped) {
            finalPersonImage = cropped;
            setPersonImage(cropped);
          }
        } catch (e) {
          console.error("Photo crop failed:", e);
        }
      }

      // Merge data and ensure all fields are present for controlled inputs
      const initialData: NIDInfo = {
        nameBangla: data.nameBangla || '',
        nameEnglish: data.nameEnglish || '',
        fatherName: data.fatherName || '',
        motherName: data.motherName || '',
        dob: data.dob || '',
        nidNumber: data.nidNumber || '',
        gender: data.gender || '',
        bloodGroup: data.bloodGroup || '',
        address: data.address || '',
        division: data.division || '',
        district: data.district || '',
        upazila: data.upazila || '',
        union: data.union || '',
        ward: data.ward || '',
        mobile: data.mobile || '',
        notes: data.notes || '',
        status: 'Alive',
        livingLocation: 'Local',
        occupation: 'Other',
        pictureUrl: finalPersonImage || '',
        ...(data.photoCropBox && Array.isArray(data.photoCropBox) ? { photoCropBox: data.photoCropBox } : {})
      };
      
      setExtractedData(initialData);
      setIsEditing(true);
    } catch (err: any) {
      setError(err.message || 'Failed to extract data. Please try another image.');
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    
    // Validation: Division, District, and Upazila are required
    if (!extractedData.division || !extractedData.district || !extractedData.upazila) {
      setError('Please select Division, District, and Upazila before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // Duplicate Check: NID, Name English, and DOB must be unique as a triplet
      const nidsRef = collection(db, 'nids');
      const q = query(
        nidsRef, 
        where('nidNumber', '==', extractedData.nidNumber),
        where('nameEnglish', '==', extractedData.nameEnglish),
        where('dob', '==', extractedData.dob)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error('Duplicate Entry: A record with this NID Number, Name, and Date of Birth already exists in the database.');
      }

      // Prepare data for Firestore: Firestore doesn't support undefined values
      const dataToSave = JSON.parse(JSON.stringify(extractedData));
      
      await addDoc(nidsRef, {
        ...dataToSave,
        createdBy: auth.currentUser?.email || 'Anonymous',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      if (err.message.includes('Duplicate Entry')) {
        setError(err.message);
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'nids');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof NIDInfo, value: string) => {
    if (extractedData) {
      const updates: Partial<NIDInfo> = { [field]: value };
      
      // Cascading Resets
      if (field === 'division') {
        updates.district = '';
        updates.upazila = '';
      } else if (field === 'district') {
        updates.upazila = '';
      } else if (field === 'status' && value === 'Dead') {
        updates.livingLocation = '' as any;
        updates.occupation = '' as any;
      } else if (field === 'livingLocation' && value === 'Foreign') {
        updates.occupation = '' as any;
      }
      
      setExtractedData({ ...extractedData, ...updates });
    }
  };

  const currentDistricts = extractedData?.division ? Object.keys(LOCATION_DATA[extractedData.division] || {}) : [];
  const currentUpazilas = (extractedData?.division && extractedData?.district) 
    ? LOCATION_DATA[extractedData.division][extractedData.district] || [] 
    : [];

  const isLocationMissing = !extractedData?.division || !extractedData?.district || !extractedData?.upazila;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-8 border-b border-slate-50 bg-gradient-to-br from-slate-50 to-white">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Scan className="w-8 h-8 text-white" />
            </div>
            NID Identity Center
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Professional NID scanning and individual record management.</p>
        </div>

        <div className="p-8 grid lg:grid-cols-12 gap-8">
          {/* Left Column: Profile & Cards */}
          <div className="lg:col-span-4 space-y-6">
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Camera className="w-3 h-3" />
                Person Profile
              </h3>
              <div className={`aspect-square w-full max-w-[240px] mx-auto rounded-3xl border-4 border-slate-50 relative overflow-hidden bg-slate-50 group hover:border-indigo-100 transition-all ${isScanning ? 'ring-4 ring-indigo-100 ring-offset-2' : ''}`}>
                {isScanning && (
                  <motion.div 
                    initial={{ top: '-100%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-indigo-500/50 blur-sm z-10"
                  />
                )}
                {personImage ? (
                  <>
                    <img src={personImage} alt="Person" className={`w-full h-full object-cover transition-opacity ${isScanning ? 'opacity-50' : 'opacity-100'}`} />
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <div className="bg-white p-3 rounded-full text-slate-900 shadow-xl">
                        <Camera className="w-5 h-5" />
                      </div>
                      <input type="file" onChange={(e) => handleUpload(e, 'person')} className="hidden" accept="image/*" />
                    </label>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-white transition-all rounded-3xl">
                    {isScanning ? (
                      <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                    ) : (
                      <User className="w-12 h-12 text-slate-300 mb-2" />
                    )}
                    <span className="text-xs font-bold text-slate-500">{isScanning ? 'AI Extracting...' : 'Upload Photo'}</span>
                    <input type="file" onChange={(e) => handleUpload(e, 'person')} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Scan className="w-3 h-3" />
                NID Card Scan
              </h3>
              <div 
                className={`aspect-[1.6/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                  image ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 hover:border-indigo-400'
                }`}
              >
                {image ? (
                  <>
                    <img src={image} alt="NID Front" className="w-full h-full object-contain p-4 transition-transform hover:scale-105" />
                    <button 
                      onClick={() => { setImage(null); setExtractedData(null); }}
                      className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-red-500 p-2 rounded-xl shadow-lg hover:bg-white hover:scale-110 transition-all"
                    >
                      <Upload className="w-4 h-4 rotate-180" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center p-6 text-center group">
                    <div className="w-14 h-14 bg-white text-slate-400 rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-slate-100 group-hover:scale-110 group-hover:text-indigo-600 transition-all">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-600 text-sm">Upload NID Front</span>
                    <input type="file" onChange={(e) => handleUpload(e, 'card')} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>

              <button
                onClick={scanNID}
                disabled={!image || isScanning}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />}
                {isScanning ? 'Auto Detecting...' : 'Extract Data'}
              </button>
            </section>
          </div>

          {/* Right Column: Detailed Form */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[10px]">Information Management</h3>
              {extractedData && (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                    isEditing 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                  {isEditing ? 'Save Changes' : 'Edit Details'}
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!extractedData && !isScanning ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-3xl"
                >
                  <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                    <Scan className="w-10 h-10 text-slate-200" />
                  </div>
                  <h4 className="text-slate-800 font-bold">Ready to Scan</h4>
                  <p className="text-sm font-medium mt-1">Upload a card to begin automated extraction</p>
                </motion.div>
              ) : isScanning ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <div key={i} className="h-14 bg-slate-50 rounded-xl border border-slate-100 animate-pulse" />
                    ))}
                  </div>
                </motion.div>
              ) : extractedData && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  {/* Basic Information Section */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <User className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Basic Identity</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <InputField label="নাম (বাংলা)" value={extractedData.nameBangla} onChange={v => updateField('nameBangla', v)} disabled={!isEditing} />
                      <InputField label="Name (English)" value={extractedData.nameEnglish} onChange={v => updateField('nameEnglish', v)} disabled={!isEditing} />
                      <InputField label="পিতা / পতি" value={extractedData.fatherName} onChange={v => updateField('fatherName', v)} disabled={!isEditing} />
                      <InputField label="মাতা" value={extractedData.motherName} onChange={v => updateField('motherName', v)} disabled={!isEditing} />
                      <InputField label="Date of Birth" value={extractedData.dob} onChange={v => updateField('dob', v)} disabled={!isEditing} />
                      <InputField label="NID Number" value={extractedData.nidNumber} onChange={v => updateField('nidNumber', v)} disabled={!isEditing} />
                      <div className="grid grid-cols-2 gap-4">
                        <SelectField label="Gender" value={extractedData.gender || ''} onChange={v => updateField('gender', v)} disabled={!isEditing} options={['Male', 'Female']} />
                        <SelectField label="Blood Group" value={extractedData.bloodGroup || ''} onChange={v => updateField('bloodGroup', v)} disabled={!isEditing} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
                      </div>
                      <InputField label="Mobile Number" value={extractedData.mobile || ''} onChange={v => updateField('mobile', v)} disabled={!isEditing} placeholder="01XXX-XXXXXX" />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="space-y-5 pt-8 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Address & Location</span>
                    </div>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <SelectField label="Status (জীবিত / মৃত)" value={extractedData.status || ''} onChange={v => updateField('status', v as any)} disabled={!isEditing} options={['Alive', 'Dead']} />
                        
                        {extractedData.status === 'Alive' && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <SelectField label="Location (দেশে / বিদেশে)" value={extractedData.livingLocation || ''} onChange={v => updateField('livingLocation', v as any)} disabled={!isEditing} options={['Local', 'Foreign']} />
                          </motion.div>
                        )}

                        {extractedData.status === 'Alive' && extractedData.livingLocation === 'Local' && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <SelectField label="Occupation (চাকরিজীবী / অনান্য)" value={extractedData.occupation || ''} onChange={v => updateField('occupation', v as any)} disabled={!isEditing} options={['Government', 'Other']} />
                          </motion.div>
                        )}
                      </div>

                      <InputField label="Full Address (As printed)" value={extractedData.address || ''} onChange={v => updateField('address', v)} disabled={!isEditing} area />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SelectField 
                          label="Division" 
                          value={extractedData.division || ''} 
                          onChange={v => updateField('division', v)} 
                          disabled={!isEditing} 
                          options={DIVISIONS} 
                          hasError={!extractedData.division && !!error && error.includes('Location')}
                        />
                        <SelectField 
                          label="District" 
                          value={extractedData.district || ''} 
                          onChange={v => updateField('district', v)} 
                          disabled={!isEditing || !extractedData.division} 
                          options={currentDistricts} 
                          hasError={!extractedData.district && !!error && error.includes('Location')}
                        />
                        <SelectField 
                          label="Upazila / Upazila" 
                          value={extractedData.upazila || ''} 
                          onChange={v => updateField('upazila', v)} 
                          disabled={!isEditing || !extractedData.district} 
                          options={currentUpazilas} 
                          hasError={!extractedData.upazila && !!error && error.includes('Location')}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-50">
                        <InputField label="Union" value={extractedData.union || ''} onChange={v => updateField('union', v)} disabled={!isEditing} />
                        <InputField label="Ward" value={extractedData.ward || ''} onChange={v => updateField('ward', v)} disabled={!isEditing} />
                      </div>
                    </div>
                  </div>

                  {/* Extra Logs Section */}
                  <div className="space-y-5 pt-8 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-amber-500">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Internal Records & Notes</span>
                    </div>
                    <InputField label="Other Information / Notes" value={extractedData.notes || ''} onChange={v => updateField('notes', v)} disabled={!isEditing} area />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  {!error && isLocationMissing && extractedData && (
                    <div className="p-4 bg-slate-50 text-slate-500 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-slate-100">
                      <div className="p-1 bg-slate-200 rounded-md">
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                      </div>
                      Select Division, District & Upazila to Commit
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={isSaving || success || isLocationMissing}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all shadow-2xl ${
                      success 
                        ? 'bg-emerald-500 text-white shadow-emerald-200' 
                        : isLocationMissing
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                          : 'bg-slate-900 text-white hover:bg-black shadow-slate-200 active:scale-[0.99]'
                    }`}
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <Check className="w-6 h-6" /> : <Save className="w-6 h-6" />}
                    {isSaving ? 'Processing Record...' : success ? 'Record Saved Successfully' : isLocationMissing ? 'Incomplete Location' : 'Commit to Database'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {recentScans.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-50 rounded-xl shadow-sm border border-amber-100">
                <History className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">My Recent Activity</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Your last 5 scans in this system</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentScans.map((scan) => (
                <motion.div 
                  key={scan.id} 
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => {
                    setExtractedData(scan);
                    setIsEditing(false);
                    setImage(null);
                    setPersonImage(scan.pictureUrl || null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="aspect-square rounded-2xl bg-slate-50 overflow-hidden mb-3 border border-slate-100 relative">
                    {scan.pictureUrl ? (
                      <img src={scan.pictureUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-800 truncate" title={scan.nameBangla}>{scan.nameBangla}</p>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tight truncate">{scan.nameEnglish}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        {scan.createdAt ? (typeof scan.createdAt.toDate === 'function' ? scan.createdAt.toDate() : new Date(scan.createdAt)).toLocaleDateString() : 'Just now'}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectField({ label, value, onChange, disabled, options, hasError }: { label: string, value: string, onChange: (v: string) => void, disabled: boolean, options: string[], hasError?: boolean }) {
  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-[0.2em] block ${hasError ? 'text-red-500' : 'text-slate-400'}`}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-5 py-4 rounded-2xl border text-sm font-medium transition-all duration-300 appearance-none bg-no-repeat bg-[right_1.25rem_center] ${
            disabled 
              ? 'bg-slate-50 border-transparent text-slate-600 cursor-default shadow-sm' 
              : hasError
                ? 'bg-red-50 border-red-200 text-red-900 focus:ring-4 focus:ring-red-100 focus:border-red-400 outline-none shadow-sm'
                : 'bg-white border-slate-200 text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm hover:border-slate-300'
          }`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`, backgroundSize: '1.25rem' }}
        >
          <option value="">Select</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
  area?: boolean;
}

function InputField({ label, value, onChange, disabled, placeholder, area }: InputFieldProps) {
  const baseClasses = `w-full px-5 py-4 rounded-2xl border text-sm font-medium transition-all duration-300 ${
    disabled 
      ? 'bg-slate-50 border-transparent text-slate-600 cursor-default shadow-sm' 
      : 'bg-white border-slate-200 text-slate-900 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm hover:border-slate-300'
  }`;

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">{label}</label>
      {area ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
          className={`${baseClasses} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={baseClasses}
        />
      )}
    </div>
  );
}
