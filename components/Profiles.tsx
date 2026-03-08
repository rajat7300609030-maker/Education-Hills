import React, { useState, useEffect } from 'react';
import { SchoolProfileData, UserProfileData, Student, Employee, FeeRecord, ExpenseRecord } from '../types';

interface ProfilesProps {
  type: 'SCHOOL' | 'USER';
  schoolData: SchoolProfileData;
  userData: UserProfileData;
  students?: Student[];
  employees?: Employee[];
  fees?: FeeRecord[];
  expenses?: ExpenseRecord[];
  onUpdateSchool: (data: SchoolProfileData) => void;
  onUpdateUser: (data: UserProfileData) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToDashboard?: () => void;
}

// Helper Component defined outside to prevent re-rendering focus loss
const InputGroup = ({ label, value, onChange, icon, type = 'text', placeholder, className = '', disabled = false, options = [], min, max }: any) => (
    <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              {icon} {label}
          </label>
        )}
        {!disabled ? (
           type === 'textarea' ? (
               <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none min-h-[100px] font-medium"
                  value={value || ''}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
               />
           ) : type === 'select' ? (
               <div className="relative">
                   <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium appearance-none"
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                   >
                       {options.map((opt: string) => (
                           <option key={opt} value={opt}>{opt}</option>
                       ))}
                   </select>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                       ▼
                   </div>
               </div>
           ) : type === 'range' ? (
               <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
                   <input 
                      type="range"
                      min={min}
                      max={max}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      value={value || 100}
                      onChange={e => onChange(e.target.value)}
                   />
                   <span className="text-xs font-bold text-indigo-600 min-w-[3rem] text-right">{value}%</span>
               </div>
           ) : (
               <input 
                  type={type}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                  value={value || ''}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
               />
           )
        ) : (
            <div className="p-3 bg-white border border-transparent rounded-xl">
                {type === 'range' ? (
                    <p className="text-slate-800 font-semibold text-base">{value || 100}% Scale</p>
                ) : (
                    <p className="text-slate-800 font-semibold text-base whitespace-pre-wrap">{value}</p>
                )}
                {!value && type !== 'range' && <p className="text-slate-300 italic text-sm">Not provided</p>}
            </div>
        )}
    </div>
);

const Profiles: React.FC<ProfilesProps> = ({ type, schoolData, userData, students, employees, fees, expenses, onUpdateSchool, onUpdateUser, onNotify, onNavigateToDashboard }) => {
  const [sData, setSData] = useState(schoolData);
  const [uData, setUData] = useState(userData);
  
  // UI States
  const [schoolSection, setSchoolSection] = useState<string | null>(null);
  const [userSection, setUserSection] = useState<string | null>(null);
  const [isProcessingId, setIsProcessingId] = useState(false);

  const [newSession, setNewSession] = useState('');
  const [isAddingSession, setIsAddingSession] = useState(false);

  // Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  useEffect(() => {
    setSData(schoolData);
  }, [schoolData]);

  useEffect(() => {
    setUData(userData);
  }, [userData]);

  // --- Helpers for Preview ---
  const getPreviewEffectClass = (effect?: string) => {
    switch(effect) {
        case 'Blur': return 'blur-[2px] scale-105';
        case 'Sepia': return 'sepia';
        case 'Grayscale': return 'grayscale';
        case 'Dark': return 'brightness-50';
        default: return '';
    }
  };

  // --- School Profile Handlers ---
  const handleSchoolSave = () => {
    onUpdateSchool(sData);
    setSchoolSection(null);
    setIsAddingSession(false);
    onNotify?.("School profile updated successfully", "success");
  };

  const handleSchoolCancel = () => {
    setSData(schoolData);
    setSchoolSection(null);
    setIsAddingSession(false);
    setNewSession('');
  };

  // --- User Profile Handlers ---
  const handleUserSave = () => {
    onUpdateUser(uData);
    setUserSection(null);
    onNotify?.("Profile section updated successfully", "success");
  };

  const handleUserCancel = () => {
    setUData(userData);
    setUserSection(null);
  };

  // --- ID Card Actions ---
  const handleDownloadIdCard = async () => {
    const cardElement = document.getElementById('user-id-card');
    const html2canvas = (window as any).html2canvas;
    
    if (!cardElement || !html2canvas) {
      onNotify?.("System error: Card renderer not available.", "error");
      return;
    }

    setIsProcessingId(true);
    onNotify?.("Generating high-quality ID image...", "info");

    try {
      const canvas = await html2canvas(cardElement, {
        scale: 3, // 3x scale for high resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement('a');
      const safeName = uData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.href = image;
      link.download = `ID_Card_${safeName}_${uData.userId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify?.("ID Card downloaded successfully!", "success");
    } catch (err) {
      console.error("ID Download Error:", err);
      onNotify?.("Failed to generate ID download.", "error");
    } finally {
      setIsProcessingId(false);
    }
  };

  const handleShareIdCard = async () => {
    const cardElement = document.getElementById('user-id-card');
    const html2canvas = (window as any).html2canvas;
    
    if (!cardElement || !html2canvas) {
      onNotify?.("System error: Card renderer not available.", "error");
      return;
    }

    setIsProcessingId(true);
    onNotify?.("Preparing image for sharing...", "info");

    try {
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
          onNotify?.("Failed to generate image data.", "error");
          setIsProcessingId(false);
          return;
        }

        const safeName = uData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const file = new File([blob], `ID_Card_${safeName}.png`, { type: 'image/png' });

        // Check if Web Share API supports file sharing
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${uData.name} - Faculty ID Card`,
              text: `Digital ID Card for ${uData.name} from ${sData.name}`
            });
            onNotify?.("Shared successfully!", "success");
          } catch (shareErr) {
            console.log("Share cancelled or failed", shareErr);
          }
        } else {
          // Fallback to download if sharing is not supported
          handleDownloadIdCard();
          onNotify?.("Sharing not supported by browser. Downloading instead.", "info");
        }
        setIsProcessingId(false);
      }, 'image/png');

    } catch (err) {
      console.error("ID Share Error:", err);
      onNotify?.("Failed to process ID share.", "error");
      setIsProcessingId(false);
    }
  };

  // --- Session Logic ---
  const requestAddSession = () => {
    if (newSession.trim() && !sData.sessions.includes(newSession.trim())) {
        setConfirmation({
            isOpen: true,
            title: 'Add New Session',
            message: `Are you sure you want to add academic session "${newSession.trim()}"? You will be redirected to the Dashboard upon confirmation.`,
            action: () => {
                const updatedSessions = [...sData.sessions, newSession.trim()];
                const newData = { ...sData, sessions: updatedSessions };
                onUpdateSchool(newData); 
                setSData(newData);
                setNewSession('');
                setIsAddingSession(false);
                onNotify?.(`Session ${newSession.trim()} added successfully`, 'success');
                onNavigateToDashboard?.();
            }
        });
    }
  };

  const requestDeleteSession = (session: string) => {
    // Validation 1: At least one session must remain
    if (sData.sessions.length <= 1) {
        onNotify?.("⚠️ Cannot delete. System requires at least one active session.", "error");
        return;
    }

    // Validation 2: Check for data in Students (including recycled)
    const hasStudents = students?.some(s => s.session === session);
    if (hasStudents) {
        onNotify?.(`❌ Cannot delete session "${session}". Student details are available.`, "error");
        return;
    }

    // Validation 3: Check for data in Fees (including recycled)
    const hasFees = fees?.some(f => f.session === session);
    if (hasFees) {
        onNotify?.(`❌ Cannot delete session "${session}". Fee transaction details are available.`, "error");
        return;
    }

    // Validation 4: Check for data in Expenses (including recycled)
    const hasExpenses = expenses?.some(e => e.session === session);
    if (hasExpenses) {
        onNotify?.(`❌ Cannot delete session "${session}". Expense details are available.`, "error");
        return;
    }

    setConfirmation({
        isOpen: true,
        title: 'Delete Session',
        message: `Are you sure you want to delete session "${session}"? This session is currently empty and will be removed permanently.`,
        action: () => {
              const updatedSessions = sData.sessions.filter(s => s !== session);
              let updatedCurrent = sData.currentSession;
              if (session === sData.currentSession) {
                updatedCurrent = updatedSessions.length > 0 ? updatedSessions[0] : '';
              }
              const newData = { ...sData, sessions: updatedSessions, currentSession: updatedCurrent };
              onUpdateSchool(newData);
              setSData(newData);
              onNotify?.(`Session ${session} deleted`, 'info');
              onNavigateToDashboard?.();
        }
    });
  };

  const requestChangeSession = (session: string) => {
      setConfirmation({
          isOpen: true,
          title: 'Change Active Session',
          message: `Are you sure you want to switch the active academic session to "${session}"?`,
          action: () => {
              const newData = { ...sData, currentSession: session };
              onUpdateSchool(newData);
              setSData(newData);
              onNotify?.(`Active session changed to ${session}`, 'success');
              onNavigateToDashboard?.();
          }
      });
  };

  // --- Image Handlers ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner' | 'authorizedSignature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (field: 'logo' | 'banner' | 'authorizedSignature') => {
      setSData(prev => ({ ...prev, [field]: undefined }));
  };

  // --- User Image Handlers ---
  const handleUserImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveUserImage = () => {
      setUData(prev => ({ ...prev, photo: undefined }));
  };

  // Pattern fix constant
  const SVG_TEXTURE = "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.08' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E";

  // --- Render: School Profile ---
  if (type === 'SCHOOL') {
    const isIdentityEditing = schoolSection === 'IDENTITY';
    const isGeneralEditing = schoolSection === 'GENERAL';
    const isContactEditing = schoolSection === 'CONTACT';
    const isAcademicsEditing = schoolSection === 'ACADEMICS';
    const isPoliciesEditing = schoolSection === 'POLICIES';
    const isAppearanceEditing = schoolSection === 'APPEARANCE';

    const calculateCompleteness = () => {
        const fields = [
            sData.name, sData.address, sData.contactEmail, sData.contactNumber, 
            sData.motto, sData.website, sData.logo, sData.banner, 
            sData.establishedYear
        ];
        const filled = fields.filter(f => f && f.length > 0).length;
        return Math.round((filled / fields.length) * 100);
    };
    const completionRate = calculateCompleteness();

    return (
      <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">School Profile</h2>
                <p className="text-slate-500 font-medium">Manage institutional identity and configurations.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden relative">
                <div className="h-32 bg-slate-100 relative overflow-hidden group">
                    {sData.banner ? (
                        <img 
                            src={sData.banner} 
                            alt="Banner" 
                            className={`w-full h-full object-cover transition-all duration-500 ${getPreviewEffectClass(sData.bannerEffect)}`} 
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-slate-800 to-indigo-900 relative">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("${SVG_TEXTURE}")` }}></div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/10"></div>
                    
                    {!isIdentityEditing && (
                        <button 
                            onClick={() => setSchoolSection('IDENTITY')}
                            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-full text-white transition-colors"
                        >
                            ✏️
                        </button>
                    )}

                    {isIdentityEditing && (
                        <div className="absolute top-4 right-4 flex gap-2">
                             <label className="cursor-pointer bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-all">
                                 📷
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
                             </label>
                             {sData.banner && (
                                 <button onClick={() => handleRemoveImage('banner')} className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md">🗑️</button>
                             )}
                        </div>
                    )}
                </div>

                <div className="px-8 pb-8 text-center relative">
                    <div className="w-32 h-32 mx-auto -mt-16 bg-white rounded-3xl p-2 shadow-lg mb-4 relative group rotate-3 hover:rotate-0 transition-transform duration-300">
                        <div className="w-full h-full rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden relative">
                            {sData.logo ? (
                                <img src={sData.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-5xl">🏫</span>
                            )}
                        </div>
                        {isIdentityEditing && (
                            <div className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-sm z-20 animate-fade-in">
                                <label className="cursor-pointer flex flex-col items-center">
                                    <span className="text-xl">📷</span>
                                    <span className="text-[8px] font-bold uppercase mt-1">Logo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                </label>
                            </div>
                        )}
                    </div>

                    {isIdentityEditing ? (
                        <div className="space-y-3 mt-4">
                            <input 
                                className="w-full text-center text-xl font-black text-slate-800 bg-slate-50 border-b-2 border-indigo-200 focus:border-indigo-600 outline-none py-1 rounded"
                                value={sData.name}
                                onChange={e => setSData({...sData, name: e.target.value})}
                                placeholder="School Name"
                            />
                            <input 
                                className="w-full text-center text-sm font-medium text-slate-500 bg-slate-50 border-b-2 border-slate-200 focus:border-indigo-400 outline-none py-1 rounded"
                                value={sData.motto}
                                onChange={e => setSData({...sData, motto: e.target.value})}
                                placeholder="Motto"
                            />
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-black text-slate-800 leading-tight">{sData.name || 'School Name'}</h2>
                            <p className="text-sm font-medium text-slate-500 italic mt-1">"{sData.motto || 'Education for Future'}"</p>
                        </>
                    )}
                    
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 text-xs font-bold text-indigo-700">
                        <span>🆔</span> {sData.affiliationNumber || 'N/A'}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Session</p>
                             <p className="text-sm font-bold text-slate-700 mt-1">{sData.currentSession}</p>
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Total Students</p>
                             <p className="text-sm font-bold text-slate-700 mt-1">{students?.filter(s => !s.isDeleted).length || 0}</p>
                         </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Profile Completeness</span>
                            <span className="text-indigo-600 font-bold text-xs">{completionRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    completionRate === 100 ? 'bg-emerald-400' : 'bg-indigo-400'
                                }`} 
                                style={{ width: `${completionRate}%` }}
                            ></div>
                        </div>
                    </div>

                    {isIdentityEditing && (
                        <div className="flex gap-2 justify-center mt-6 pt-4 border-t border-slate-100">
                            <button onClick={handleSchoolCancel} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                            <button onClick={handleSchoolSave} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                                <span>💾</span> Save
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">📜</span>
                            <h3 className="text-xl font-bold text-slate-800">General Information</h3>
                        </div>
                        {!isGeneralEditing && (
                            <button 
                                onClick={() => setSchoolSection('GENERAL')}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                ✏️
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputGroup 
                            icon="📅" label="Established Year" 
                            value={sData.establishedYear} 
                            onChange={(v: string) => setSData({...sData, establishedYear: v})} 
                            disabled={!isGeneralEditing}
                        />
                        <InputGroup 
                            icon="🎓" label="Board of Education" 
                            value={sData.board} 
                            onChange={(v: string) => setSData({...sData, board: v})} 
                            disabled={!isGeneralEditing}
                        />
                         <InputGroup 
                            icon="🏷️" label="Affiliation Number" 
                            value={sData.affiliationNumber} 
                            onChange={(v: string) => setSData({...sData, affiliationNumber: v})} 
                            disabled={!isGeneralEditing}
                        />
                    </div>

                    {isGeneralEditing && (
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 animate-fade-in">
                            <button onClick={handleSchoolCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={handleSchoolSave} className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <span>💾</span> Save Changes
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">📍</span>
                            <h3 className="text-xl font-bold text-slate-800">Contact & Location</h3>
                        </div>
                        {!isContactEditing && (
                            <button 
                                onClick={() => setSchoolSection('CONTACT')}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                ✏️
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputGroup 
                            icon="📞" label="Phone Number" 
                            value={sData.contactNumber} 
                            onChange={(v: string) => setSData({...sData, contactNumber: v})}
                            type="tel"
                            disabled={!isContactEditing}
                        />
                        <InputGroup 
                            icon="📧" label="Email Address" 
                            value={sData.contactEmail} 
                            onChange={(v: string) => setSData({...sData, contactEmail: v})}
                            type="email"
                            disabled={!isContactEditing}
                        />
                        <div className="md:col-span-2">
                            <InputGroup 
                                icon="🌐" label="Website URL" 
                                value={sData.website} 
                                onChange={(v: string) => setSData({...sData, website: v})}
                                type="url"
                                disabled={!isContactEditing}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <InputGroup 
                                icon="📍" label="Campus Address" 
                                value={sData.address} 
                                onChange={(v: string) => setSData({...sData, address: v})}
                                type="textarea"
                                disabled={!isContactEditing}
                            />
                        </div>
                    </div>

                    {isContactEditing && (
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 animate-fade-in">
                            <button onClick={handleSchoolCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={handleSchoolSave} className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <span>💾</span> Save Changes
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl">📅</span>
                            <h3 className="text-xl font-bold text-slate-800">Academic Configuration</h3>
                        </div>
                        {!isAcademicsEditing && (
                            <button 
                                onClick={() => setSchoolSection('ACADEMICS')}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                ✏️
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Sessions</label>
                                {isAcademicsEditing && (
                                    <button 
                                        onClick={() => setIsAddingSession(true)}
                                        className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100"
                                    >
                                        + Add Session
                                    </button>
                                )}
                            </div>
                            
                            {isAddingSession && (
                                <div className="mb-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-2 animate-fade-in">
                                    <input 
                                        autoFocus
                                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 2026-2027"
                                        value={newSession}
                                        onChange={e => setNewSession(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && requestAddSession()}
                                    />
                                    <button onClick={requestAddSession} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700">Add</button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {sData.sessions.map(session => {
                                    const isActive = session === sData.currentSession;

                                    return (
                                        <div key={session} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                                    {isActive ? '⭐' : '🗓️'}
                                                </div>
                                                <span className={`font-bold text-sm ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{session}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {isAcademicsEditing && !isActive && (
                                                    <button onClick={() => requestChangeSession(session)} className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">Set Active</button>
                                                )}
                                                {isAcademicsEditing && !isActive && (
                                                    <button onClick={() => requestDeleteSession(session)} className="text-red-400 hover:text-red-600 p-1">🗑️</button>
                                                )}
                                                {!isAcademicsEditing && isActive && (
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100">Current</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {isAcademicsEditing && (
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 animate-fade-in">
                            <button onClick={handleSchoolCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={handleSchoolSave} className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <span>💾</span> Save Changes
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">🎨</span>
                            <h3 className="text-xl font-bold text-slate-800">Visual Appearance</h3>
                        </div>
                        {!isAppearanceEditing && (
                            <button 
                                onClick={() => setSchoolSection('APPEARANCE')}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                ✏️
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputGroup 
                            icon="📏" label="Logo Scaling" 
                            type="range" min="50" max="150"
                            value={sData.logoSize || 100} 
                            onChange={(v: string) => setSData({...sData, logoSize: parseInt(v)})} 
                            disabled={!isAppearanceEditing}
                        />
                        <InputGroup 
                            icon="✨" label="Banner Visual Effect" 
                            type="select" options={['Standard', 'Blur', 'Sepia', 'Grayscale', 'Dark']}
                            value={sData.bannerEffect || 'Standard'} 
                            onChange={(v: string) => setSData({...sData, bannerEffect: v as any})} 
                            disabled={!isAppearanceEditing}
                        />
                    </div>

                    {isAppearanceEditing && (
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 animate-fade-in">
                            <button onClick={handleSchoolCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={handleSchoolSave} className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <span>💾</span> Save Changes
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center text-xl">⚖️</span>
                            <h3 className="text-xl font-bold text-slate-800">Legal & Official</h3>
                        </div>
                        {!isPoliciesEditing && (
                            <button 
                                onClick={() => setSchoolSection('POLICIES')}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                ✏️
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        <InputGroup 
                            label="Terms & Conditions"
                            icon="📝"
                            type="textarea"
                            value={sData.termsAndConditions}
                            onChange={(v: string) => setSData({...sData, termsAndConditions: v})}
                            placeholder="Enter detailed terms, conditions, and school policies here..."
                            className="min-h-[150px]"
                            disabled={!isPoliciesEditing}
                        />

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                ✍️ Authorized Signature
                            </label>
                            <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center min-h-[150px] transition-all relative ${isPoliciesEditing ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                                {sData.authorizedSignature ? (
                                    <div className="relative w-full max-w-md group/sig">
                                        <img src={sData.authorizedSignature} alt="Authorized Signature" className="w-full h-auto object-contain max-h-[120px] mx-auto" />
                                        {isPoliciesEditing && (
                                            <div className="absolute top-0 right-0 p-1">
                                                <button onClick={() => handleRemoveImage('authorizedSignature')} className="bg-red-500 text-white p-1.5 rounded-lg shadow hover:bg-red-600">🗑️</button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <p className="text-sm font-bold">No Signature</p>
                                    </div>
                                )}
                                
                                {isPoliciesEditing && !sData.authorizedSignature && (
                                    <label className="mt-4 cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2">
                                        <span>📤</span> Upload
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'authorizedSignature')} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {isPoliciesEditing && (
                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 animate-fade-in">
                            <button onClick={handleSchoolCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={handleSchoolSave} className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <span>💾</span> Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {confirmation.isOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-sm text-center animate-scale-in">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmation.title}</h3>
                    <p className="text-slate-500 mb-6">{confirmation.message}</p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmation({ ...confirmation, isOpen: false })} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">No</button>
                        <button onClick={() => { confirmation.action(); setConfirmation({ ...confirmation, isOpen: false }); }} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">Yes</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- Render: User Profile ---
  const isEditingIdentity = userSection === 'IDENTITY';
  const isEditingPersonal = userSection === 'PERSONAL';
  const isEditingContact = userSection === 'CONTACT';

  return (
        <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">User Profile</h2>
                    <p className="text-slate-500 font-medium">Manage your personal information and account settings.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden relative">
                    <div className="h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("${SVG_TEXTURE}")` }}></div>
                        {!isEditingIdentity && (
                            <button onClick={() => setUserSection('IDENTITY')} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-full text-white transition-colors">✏️</button>
                        )}
                    </div>

                    <div className="px-8 pb-8 text-center relative">
                        <div className="w-32 h-32 mx-auto -mt-16 bg-white rounded-full p-2 shadow-lg mb-4 relative group">
                            <div className="w-full h-full rounded-full bg-slate-100 border-2 border-slate-100 flex items-center justify-center text-6xl shadow-inner overflow-hidden relative">
                                {uData.photo ? (
                                    <img src={uData.photo} alt={uData.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center">
                                        {uData.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            {isEditingIdentity && (
                                <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-sm z-20 animate-fade-in">
                                    <span className="text-xl">📷</span>
                                    <span className="text-[10px] font-bold uppercase mt-1">Change</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleUserImageUpload} />
                                </label>
                            )}
                            {isEditingIdentity && uData.photo && (
                                 <button onClick={handleRemoveUserImage} className="absolute -bottom-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 z-30">🗑️</button>
                            )}
                        </div>

                        <h2 className="text-2xl font-black text-slate-800">{uData.name || 'User Name'}</h2>
                        
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-500">
                            <span>🆔</span> {uData.userId || 'ID-000'}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                             <div>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                                 <div className="flex items-center justify-center gap-1.5 mt-1">
                                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                     <span className="text-sm font-bold text-slate-700">Active</span>
                                 </div>
                             </div>
                             <div>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">Joined</p>
                                 <p className="text-sm font-bold text-slate-700 mt-1">
                                    {uData.joiningDate ? new Date(uData.joiningDate).toLocaleDateString(undefined, {year: 'numeric', month: 'short'}) : 'N/A'}
                                 </p>
                             </div>
                        </div>

                        {isEditingIdentity && (
                            <div className="flex gap-2 justify-center mt-6 pt-4 border-t border-slate-100">
                                <button onClick={handleUserCancel} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                                <button onClick={handleUserSave} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"><span>💾</span> Save</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">👤</span>
                                <h3 className="text-xl font-bold text-slate-800">Personal Information</h3>
                            </div>
                            {!isEditingPersonal && (
                                <button onClick={() => setUserSection('PERSONAL')} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">✏️</button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup icon="🏷️" label="Full Name" value={uData.name} onChange={(v: string) => setUData({...uData, name: v})} disabled={!isEditingPersonal} />
                            <InputGroup icon="🎂" label="Date of Birth" value={uData.dateOfBirth} onChange={(v: string) => setUData({...uData, dateOfBirth: v})} type="date" disabled={!isEditingPersonal} />
                            <div className="md:col-span-2">
                                <InputGroup icon="📝" label="Bio / About" value={uData.bio} onChange={(v: string) => setUData({...uData, bio: v})} type="textarea" disabled={!isEditingPersonal} className="min-h-[100px]" />
                            </div>
                        </div>

                        {isEditingPersonal && (
                            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 animate-fade-in">
                                <button onClick={handleUserCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button onClick={handleUserSave} className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2"><span>💾</span> Save Changes</button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">📞</span>
                                <h3 className="text-xl font-bold text-slate-800">Contact Details</h3>
                            </div>
                            {!isEditingContact && (
                                <button onClick={() => setUserSection('CONTACT')} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">✏️</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup icon="📧" label="Email Address" value={uData.email} onChange={(v: string) => setUData({...uData, email: v})} type="email" disabled={!isEditingContact} />
                            <InputGroup icon="📱" label="Phone Number" value={uData.contactNumber} onChange={(v: string) => setUData({...uData, contactNumber: v})} type="tel" disabled={!isEditingContact} />
                            <div className="md:col-span-2">
                                <InputGroup icon="🏠" label="Residential Address" value={uData.address} onChange={(v: string) => setUData({...uData, address: v})} type="textarea" disabled={!isEditingContact} />
                            </div>
                        </div>

                        {isEditingContact && (
                            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 animate-fade-in">
                                <button onClick={handleUserCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button onClick={handleUserSave} className="px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2"><span>💾</span> Save Changes</button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">🛡️</span>
                                <h3 className="text-xl font-bold text-slate-800">All Administrators</h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {employees?.filter(e => !e.isDeleted && (e.role.toLowerCase().includes('admin') || e.role.toLowerCase().includes('principal'))).map(admin => (
                                <div key={admin.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all group">
                                    <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                        {admin.photo ? (
                                            <img src={admin.photo} alt={admin.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-bold text-slate-400">{admin.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 truncate group-hover:text-amber-600 transition-colors">{admin.name}</h4>
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{admin.role}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-slate-400 font-medium">📞 {admin.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!employees || employees.filter(e => !e.isDeleted && (e.role.toLowerCase().includes('admin') || e.role.toLowerCase().includes('principal'))).length === 0) && (
                                <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm font-medium">No other administrators found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">🪪</span>
                                <h3 className="text-xl font-bold text-slate-800">Digital ID Card</h3>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div id="user-id-card" className="w-[300px] h-[480px] bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200 relative flex flex-col shrink-0 transform transition-transform hover:scale-[1.02]">
                                <div className="h-32 bg-indigo-900 relative p-4 flex items-center justify-start gap-3 z-0">
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("${SVG_TEXTURE}")` }}></div>
                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-2xl shadow-md border-2 border-indigo-100 relative z-10 overflow-hidden shrink-0">
                                        {schoolData.logo ? <img src={schoolData.logo} className="w-full h-full object-contain p-1"/> : '🏫'}
                                    </div>
                                    <div className="relative z-10 flex-1 text-left">
                                        <h2 className="text-white font-black text-xs uppercase tracking-wider leading-tight">{schoolData.name}</h2>
                                        {schoolData.motto && <p className="text-indigo-200 text-[9px] italic mt-1 font-medium leading-tight">"{schoolData.motto}"</p>}
                                    </div>
                                </div>

                                <div className="flex-1 bg-white relative flex flex-col items-center pt-6 px-6 pb-4">
                                    {/* Watermark Logo */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] overflow-hidden z-0">
                                        {schoolData.logo ? (
                                            <img src={schoolData.logo} className="w-64 h-64 object-contain grayscale" />
                                        ) : (
                                            <span className="text-[12rem]">🏫</span>
                                        )}
                                    </div>

                                    {/* User Photo Container - Positioned normally below the header */}
                                    <div className="mb-4 w-32 h-32 rounded-2xl bg-white p-1.5 shadow-2xl z-10 border-2 border-slate-50 shrink-0">
                                        <div className="w-full h-full rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                                            {uData.photo ? <img src={uData.photo} className="w-full h-full object-cover" /> : <span className="text-6xl">👤</span>}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-800 mt-2 text-center relative z-10 leading-tight">{uData.name}</h3>

                                    <div className="w-full mt-4 space-y-1.5 flex-1 relative z-10">
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Number</span>
                                            <span className="text-xs font-bold text-slate-700 font-mono">{uData.userId}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session</span>
                                            <span className="text-xs font-bold text-slate-700">{schoolData.currentSession || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOB</span>
                                            <span className="text-xs font-bold text-slate-700">{uData.dateOfBirth ? new Date(uData.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</span>
                                            <span className="text-xs font-bold text-slate-700">{uData.contactNumber || 'N/A'}</span>
                                        </div>
                                        
                                        <div className="pt-1 border-t border-slate-50 mt-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Address</span>
                                            <p className="text-[10px] font-medium text-slate-600 leading-tight line-clamp-2">{uData.address || 'N/A'}</p>
                                        </div>

                                        <div className="flex justify-between items-end mt-3 pt-2">
                                            <div className="flex flex-col justify-end">
                                                {schoolData.authorizedSignature && <img src={schoolData.authorizedSignature} alt="Signature" className="h-8 w-auto object-contain mb-1 origin-left" />}
                                                <div className="h-px w-20 bg-slate-300 mb-0.5"></div>
                                                <p className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">Authorized Signature</p>
                                            </div>
                                            <div className="p-0.5 bg-white border border-slate-100 rounded shadow-sm">
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`ID:${uData.userId}|Name:${uData.name}`)}`} alt="QR" className="w-12 h-12"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto w-full text-center relative z-10">
                                         <div className="border-t border-slate-100 pt-2 mb-2">
                                            <p className="text-[8px] text-slate-500 font-bold leading-tight mb-0.5 px-2 line-clamp-1">{schoolData.address}</p>
                                            <p className="text-[8px] text-slate-400">{schoolData.contactNumber} • {schoolData.contactEmail}</p>
                                         </div>
                                        <p className="text-[7px] text-center text-slate-400 uppercase font-bold tracking-[0.3em] mb-1">Faculty Identity Card</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full md:w-auto flex-1">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-slate-700 text-sm mb-1">Manage ID Card</h4>
                                    <p className="text-xs text-slate-500">Download a high-quality printable version or share it digitally via WhatsApp, Email, etc.</p>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleDownloadIdCard}
                                        disabled={isProcessingId}
                                        className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 group disabled:opacity-70"
                                    >
                                        <span className="text-2xl group-hover:-translate-y-1 transition-transform">{isProcessingId ? '⏳' : '📥'}</span>
                                        <span className="text-xs font-bold uppercase">{isProcessingId ? 'Working' : 'Download'}</span>
                                    </button>
                                    <button 
                                        onClick={handleShareIdCard}
                                        disabled={isProcessingId}
                                        className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm transition-all active:scale-95 group disabled:opacity-70"
                                    >
                                        <span className="text-2xl group-hover:-translate-y-1 transition-transform">{isProcessingId ? '⏳' : '🔗'}</span>
                                        <span className="text-xs font-bold uppercase">Share</span>
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 italic">Powered by high-resolution card generator ⚡</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
  );
};

export default Profiles;