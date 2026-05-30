import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Trash2, 
  Edit2, 
  Upload,
  Save, 
  X, 
  Loader2, 
  Download,
  AlertCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Phone,
  MapPin,
  FileText,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NIDInfo } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { DIVISIONS, LOCATION_DATA } from '../data/location';

export function NIDDatabase() {
  const [data, setData] = useState<NIDInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<NIDInfo>>({});
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    const path = 'nids';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NIDInfo[];
      setData(records);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'nids', id));
      if (detailsId === id) setDetailsId(null);
      if (selectedIds.has(id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
      }
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `nids/${id}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} records?`)) return;

    setIsBulkDeleting(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => {
        batch.delete(doc(db, 'nids', id));
      });
      await batch.commit();
      setSelectedIds(new Set());
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'nids (bulk)');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const recordsToExport = data;
    if (recordsToExport.length === 0) return;

    const headers = [
      'NID Number', 'Name (Bangla)', 'Name (English)', 'Father Name', 'Mother Name',
      'Date of Birth', 'Gender', 'Mobile', 'Blood Group', 'Status', 'Living Location',
      'Occupation', 'Address', 'Division', 'District', 'Upazila', 'Union', 'Ward', 'Notes'
    ];

    const csvContent = '\ufeff' + [
      headers.join(','),
      ...recordsToExport.map(r => [
        `"${r.nidNumber || ''}"`,
        `"${r.nameBangla || ''}"`,
        `"${r.nameEnglish || ''}"`,
        `"${r.fatherName || ''}"`,
        `"${r.motherName || ''}"`,
        `"${r.dob || ''}"`,
        `"${r.gender || ''}"`,
        `"${r.mobile || ''}"`,
        `"${r.bloodGroup || ''}"`,
        `"${r.status || 'Alive'}"`,
        `"${r.livingLocation || ''}"`,
        `"${r.occupation || ''}"`,
        `"${(r.address || '').replace(/"/g, '""')}"`,
        `"${r.division || ''}"`,
        `"${r.district || ''}"`,
        `"${r.upazila || ''}"`,
        `"${r.union || ''}"`,
        `"${r.ward || ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `universal_identity_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(r => r.id!)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const startEdit = (record: NIDInfo) => {
    setEditingId(record.id!);
    setEditValues(record);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditValues(prev => ({ ...prev, pictureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    if (!editValues.division || !editValues.district || !editValues.upazila) {
      // We don't have a local error state in NIDDatabase but we can handle it via the button disabled state 
      // and maybe a simple alert or just relying on the UI
      return;
    }

    try {
      const docRef = doc(db, 'nids', editingId);
      // Remove id from editValues to avoid saving it back into the document body
      const { id, ...dataToSave } = editValues as any;
      
      // Sanitization: Firestore doesn't like undefined
      const sanitizedData = JSON.parse(JSON.stringify(dataToSave));
      
      await updateDoc(docRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp()
      });
      setEditingId(null);
      setEditValues({});
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `nids/${editingId}`);
    }
  };

  const updateEditField = (field: keyof NIDInfo, value: any) => {
    const updates: Partial<NIDInfo> = { [field]: value };
    
    if (field === 'division') {
      updates.district = '';
      updates.upazila = '';
    } else if (field === 'district') {
      updates.upazila = '';
    } else if (field === 'status' && value === 'Dead') {
      updates.livingLocation = undefined;
      updates.occupation = undefined;
    } else if (field === 'livingLocation' && value === 'Foreign') {
      updates.occupation = undefined;
    }
    
    setEditValues(prev => ({ ...prev, ...updates }));
  };

  const editDistricts = editValues.division ? Object.keys(LOCATION_DATA[editValues.division] || {}) : [];
  const editUpazilas = (editValues.division && editValues.district) 
    ? LOCATION_DATA[editValues.division][editValues.district] || [] 
    : [];

  const isEditLocationMissing = !editValues.division || !editValues.district || !editValues.upazila;

  const filteredData = data.filter(record => 
    record.nameEnglish.toLowerCase().includes(search.toLowerCase()) ||
    record.nameBangla.includes(search) ||
    record.nidNumber.includes(search) ||
    (record.mobile && record.mobile.includes(search)) ||
    (record.address && record.address.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedRecord = data.find(r => r.id === detailsId);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header & Search */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div>
              <h2 className="text-4xl font-black text-slate-800 flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 italic">
                  <Database className="w-8 h-8 text-white" />
                </div>
                Universal Identity Database
              </h2>
              <p className="text-slate-500 mt-2 font-medium">Repository of processed NID records and personal information.</p>
            </div>

            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="lg:hidden flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-200 hover:bg-red-600 transition-all"
                >
                  {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete ({selectedIds.size})
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button
              onClick={handleExportCSV}
              disabled={data.length === 0}
              className="flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-100 hover:bg-slate-50 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download All (CSV)
            </button>

            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="hidden lg:flex items-center gap-2 px-8 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-200 hover:bg-red-600 transition-all whitespace-nowrap"
                >
                  {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Selected ({selectedIds.size})
                </motion.button>
              )}
            </AnimatePresence>

            <div className="relative group w-full lg:w-96">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search name, NID, mobile or address..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm tracking-tight"
              />
            </div>
          </div>
        </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={data.length} color="indigo" />
        <StatCard label="Added Today" value={data.filter(r => {
          if (!r.createdAt) return false;
          const date = typeof r.createdAt.toDate === 'function' ? r.createdAt.toDate() : new Date(r.createdAt);
          return date.toDateString() === new Date().toDateString();
        }).length} color="emerald" />
        <StatCard label="With Mobile" value={data.filter(r => !!r.mobile).length} color="amber" />
        <StatCard label="Search Matches" value={filteredData.length} color="pink" />
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-left w-12">
                  <div 
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${
                      selectedIds.size === filteredData.length && filteredData.length > 0
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-slate-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    {selectedIds.size === filteredData.length && filteredData.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    {selectedIds.size > 0 && selectedIds.size < filteredData.length && <div className="w-2 h-0.5 bg-indigo-600" />}
                  </div>
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Name</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact & ID</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">DOB / Blood</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Officer</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-slate-400 mt-4 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing records...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-40 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                      <Database className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-slate-500 font-black uppercase tracking-widest text-xs">No Records Located</h3>
                    <p className="text-slate-400 text-xs mt-2 font-bold">Try adjusting your query or scanning new identification.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => (
                  <tr 
                    key={record.id} 
                    className={`hover:bg-indigo-50/20 transition-all group cursor-pointer ${selectedIds.has(record.id!) ? 'bg-indigo-50/40' : ''}`} 
                    onClick={() => setDetailsId(record.id!)}
                  >
                    <td className="px-8 py-6" onClick={e => toggleSelectOne(record.id!, e)}>
                      <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                        selectedIds.has(record.id!)
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-slate-200 bg-white group-hover:border-indigo-300'
                      }`}>
                        {selectedIds.has(record.id!) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                        {record.pictureUrl ? (
                          <img src={record.pictureUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800 text-sm">{record.nameBangla}</div>
                      <div className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-0.5">{record.nameEnglish}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-mono text-xs font-bold text-slate-700">{record.nidNumber}</div>
                      {record.mobile && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg w-fit mt-1.5 uppercase tracking-wider">
                          <Phone className="w-3 h-3" />
                          {record.mobile}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-bold text-slate-600">{record.dob}</div>
                      {record.bloodGroup && (
                        <div className="text-[10px] font-black text-red-500 mt-1 uppercase tracking-widest italic">{record.bloodGroup} Group</div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit truncate max-w-[120px]" title={record.createdBy}>
                        {(record.createdBy as string || 'System').split('@')[0]}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setDetailsId(record.id!)}
                          className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(record.id!)}
                          disabled={isDeleting === record.id}
                          className={`p-3 border rounded-xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 ${
                            confirmDeleteId === record.id 
                              ? 'bg-red-500 border-red-500 text-white animate-pulse px-4' 
                              : 'bg-white border-slate-100 text-slate-400 hover:text-red-500'
                          }`}
                        >
                          {isDeleting === record.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : confirmDeleteId === record.id ? (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Confirm?</span>
                            </>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Side-over / Modal */}
      <AnimatePresence>
        {detailsId && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              className="bg-white w-full max-w-2xl h-full rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Identity Details</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Reference ID: {selectedRecord.id}</p>
                </div>
                <button 
                  onClick={() => setDetailsId(null)}
                  className="p-3 bg-white text-slate-400 hover:text-slate-800 rounded-2xl shadow-sm border border-slate-100 transition-all hover:scale-105"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* Visual Bio section */}
                <div className="flex items-start gap-8">
                  <div className="w-32 h-32 rounded-3xl bg-slate-100 border-4 border-slate-50 shadow-lg overflow-hidden flex-shrink-0">
                    {selectedRecord.pictureUrl ? (
                      <img src={selectedRecord.pictureUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 py-2">
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedRecord.nameBangla}</h2>
                    <h3 className="text-lg font-black text-indigo-600 uppercase tracking-tight">{selectedRecord.nameEnglish}</h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest">
                      <Scan className="w-3.5 h-3.5" />
                      {selectedRecord.nidNumber}
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
                  <InfoItem icon={<User className="w-4 h-4" />} label="Father / Husband" value={selectedRecord.fatherName} />
                  <InfoItem icon={<User className="w-4 h-4" />} label="Mother" value={selectedRecord.motherName} />
                  <InfoItem icon={<ChevronRight className="w-4 h-4" />} label="Date of Birth" value={selectedRecord.dob} />
                  <InfoItem icon={<ChevronRight className="w-4 h-4" />} label="Gender" value={selectedRecord.gender || 'Not Specified'} />
                  <InfoItem icon={<Phone className="w-4 h-4" />} label="Mobile Number" value={selectedRecord.mobile || 'Not Linked'} />
                  <InfoItem icon={<Filter className="w-4 h-4" />} label="Blood Group" value={selectedRecord.bloodGroup ? `${selectedRecord.bloodGroup} Group` : 'N/A'} />
                  <InfoItem icon={<AlertCircle className="w-4 h-4" />} label="Status" value={selectedRecord.status || 'Alive'} />
                  <InfoItem icon={<User className="w-4 h-4" />} label="Created By (Officer)" value={selectedRecord.createdBy || 'System'} />
                  
                  {selectedRecord.status !== 'Dead' && (
                    <>
                      <InfoItem icon={<MapPin className="w-4 h-4" />} label="Location" value={selectedRecord.livingLocation === 'Foreign' ? 'Abroad' : 'In Country'} />
                      {selectedRecord.livingLocation !== 'Foreign' && (
                        <InfoItem icon={<FileText className="w-4 h-4" />} label="Occupation" value={selectedRecord.occupation === 'Government' ? 'Govt Job' : 'Other'} />
                      )}
                    </>
                  ) || <div />}
                </div>

                {/* Full Address */}
                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Resident Location
                  </h4>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-bold text-slate-700 text-sm leading-relaxed">
                    {selectedRecord.address || 'No full address record provided.'}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200/50">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Division</div>
                        <div>{selectedRecord.division || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">District</div>
                        <div>{selectedRecord.district || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Upazila / Union</div>
                        <div>{selectedRecord.upazila || '-'} / {selectedRecord.union || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Ward No</div>
                        <div>{selectedRecord.ward || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Additional Records
                  </h4>
                  <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100/50 font-medium text-slate-600 text-sm italic">
                    {selectedRecord.notes || 'No additional notes or records for this identity.'}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center gap-4">
                <button 
                  onClick={() => { setDetailsId(null); startEdit(selectedRecord); }}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black shadow-xl shadow-slate-200 transition-all"
                >
                  Modify Information
                </button>
                <button 
                  onClick={() => handleDelete(selectedRecord.id!)}
                  disabled={isDeleting === selectedRecord.id}
                  className={`p-4 rounded-2xl border transition-all shadow-sm flex items-center gap-3 ${
                    confirmDeleteId === selectedRecord.id 
                      ? 'bg-red-500 border-red-500 text-white animate-pulse px-6' 
                      : 'bg-white text-red-500 border-red-50 hover:bg-red-50'
                  }`}
                >
                  {isDeleting === selectedRecord.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : confirmDeleteId === selectedRecord.id ? (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Confirm?</span>
                    </>
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Update Identity</h3>
                <button onClick={cancelEdit} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-full md:w-48 space-y-4">
                    <div className="aspect-square rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative group">
                      {editValues.pictureUrl ? (
                        <img src={editValues.pictureUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                          <User className="w-12 h-12" />
                          <span className="text-[10px] font-black uppercase tracking-widest mt-2">No Photo</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center text-white gap-2 backdrop-blur-[2px]">
                        <Upload className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Change Photo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    </div>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      Click to update identity photo (JPG/PNG)
                    </p>
                  </div>

                  <div className="flex-1 grid md:grid-cols-2 gap-6">
                    <EditField label="নাম (বাংলা)" value={editValues.nameBangla || ''} onChange={v => updateEditField('nameBangla', v)} />
                  <EditField label="Name (English)" value={editValues.nameEnglish || ''} onChange={v => updateEditField('nameEnglish', v)} />
                  <EditField label="পিতা / পতি" value={editValues.fatherName || ''} onChange={v => updateEditField('fatherName', v)} />
                  <EditField label="মাতা" value={editValues.motherName || ''} onChange={v => updateEditField('motherName', v)} />
                  <EditField label="Date of Birth" value={editValues.dob || ''} onChange={v => updateEditField('dob', v)} />
                  <EditField label="NID Number" value={editValues.nidNumber || ''} onChange={v => updateEditField('nidNumber', v)} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <EditSelect label="Gender" value={editValues.gender || ''} options={['Male', 'Female']} onChange={v => updateEditField('gender', v)} />
                    <EditSelect label="Blood Group" value={editValues.bloodGroup || ''} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} onChange={v => updateEditField('bloodGroup', v)} />
                  </div>
                  
                  <EditField label="Mobile Number" value={editValues.mobile || ''} onChange={v => updateEditField('mobile', v)} />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <EditSelect label="Status (জীবিত / মৃত)" value={editValues.status || ''} onChange={v => updateEditField('status', v)} options={['Alive', 'Dead']} />
                    {editValues.status === 'Alive' && (
                      <EditSelect label="Location (দেশে / বিদেশে)" value={editValues.livingLocation || ''} onChange={v => updateEditField('livingLocation', v)} options={['Local', 'Foreign']} />
                    )}
                    {editValues.status === 'Alive' && editValues.livingLocation === 'Local' && (
                      <EditSelect label="Occupation (চাকরিজীবী / অনান্য)" value={editValues.occupation || ''} onChange={v => updateEditField('occupation', v)} options={['Government', 'Other']} />
                    )}
                  </div>

                  <EditField label="Full Address" value={editValues.address || ''} onChange={v => updateEditField('address', v)} area />
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <EditSelect label="Division" value={editValues.division || ''} options={DIVISIONS} onChange={v => updateEditField('division', v)} hasError={!editValues.division} />
                    <EditSelect label="District" value={editValues.district || ''} options={editDistricts} onChange={v => updateEditField('district', v)} disabled={!editValues.division} hasError={!editValues.district} />
                    <EditSelect label="Upazila" value={editValues.upazila || ''} options={editUpazilas} onChange={v => updateEditField('upazila', v)} disabled={!editValues.district} hasError={!editValues.upazila} />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <EditField label="Union" value={editValues.union || ''} onChange={v => updateEditField('union', v)} />
                    <EditField label="Ward" value={editValues.ward || ''} onChange={v => updateEditField('ward', v)} />
                  </div>
                </div>

                <EditField label="Notes" value={editValues.notes || ''} onChange={v => updateEditField('notes', v)} area />
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center gap-4">
                <button onClick={cancelEdit} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all">
                  Discard Changes
                </button>
                <button 
                  onClick={saveEdit} 
                  disabled={isEditLocationMissing}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all flex items-center justify-center gap-2 ${
                    isEditLocationMissing
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {isEditLocationMissing ? 'Select Location to Save' : 'Save Identity Update'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditField({ label, value, onChange, area }: { label: string, value: string, onChange: (v: string) => void, area?: boolean }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
      {area ? (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none text-sm font-medium resize-none"
          rows={3}
        />
      ) : (
        <input 
          type="text" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none text-sm font-medium"
        />
      )}
    </div>
  );
}

function EditSelect({ label, value, options, onChange, disabled, hasError }: { label: string, value: string, options: string[], onChange: (v: string) => void, disabled?: boolean, hasError?: boolean }) {
  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest block ${hasError ? 'text-red-500' : 'text-slate-400'}`}>{label}</label>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        disabled={disabled}
        className={`w-full px-5 py-3 rounded-xl border focus:ring-4 outline-none text-sm font-medium transition-all ${
          disabled 
            ? 'bg-slate-50 border-transparent text-slate-400' 
            : hasError
              ? 'bg-red-50 border-red-200 text-red-900 focus:ring-red-500/10 focus:border-red-400'
              : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/10 focus:border-indigo-400'
        }`}
      >
        <option value="">Select</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-50 to-white text-indigo-600 bg-indigo-600',
    emerald: 'from-emerald-50 to-white text-emerald-600 bg-emerald-600',
    amber: 'from-amber-50 to-white text-amber-600 bg-amber-600',
    pink: 'from-pink-50 to-white text-pink-600 bg-pink-600',
  };

  return (
    <div className={`p-6 rounded-3xl bg-gradient-to-br ${colors[color].split(' ').slice(0, 2).join(' ')} border border-white shadow-lg`}>
      <div className={`text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-slate-500`}>{label}</div>
      <div className="text-3xl font-black text-slate-800 tabular-nums leading-none tracking-tight">{value}</div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-slate-800 ml-6 tracking-tight">{value}</div>
    </div>
  );
}
