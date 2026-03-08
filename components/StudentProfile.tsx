import React, { useState, useMemo } from 'react';
import { Student, FeeRecord, SchoolProfileData } from '../types';

interface StudentProfileProps {
  student: Student;
  fees: FeeRecord[];
  schoolData: SchoolProfileData;
  currency: string;
  onBack: () => void;
  onNavigateToFees: (studentId: string) => void;
  onNavigateToEdit: (studentId: string) => void;
  onDelete: (id: string) => void;
  onPromote?: (student: Student, newSession: string, newGrade: string) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  userRole?: 'ADMIN' | 'STUDENT';
  allClasses?: string[];
}

const StudentProfile: React.FC<StudentProfileProps> = ({ 
    student, 
    fees, 
    schoolData,
    currency,
    onBack, 
    onNavigateToFees,
    onNavigateToEdit,
    onDelete,
    onPromote,
    onNotify,
    userRole = 'ADMIN',
    allClasses = []
}) => {
  const isAdmin = userRole === 'ADMIN';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [promoteData, setPromoteData] = useState({
    session: '',
    grade: student.grade
  });
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<'Classic' | 'Modern' | 'Vibrant'>('Modern');
  const [activeProfileTab, setActiveProfileTab] = useState<'ID' | 'TC'>('ID');
  const [isGenerating, setIsGenerating] = useState(false);

  // TC Customization State
  const [tcDetails, setTcDetails] = useState({
    tcNumber: `TC/${new Date().getFullYear()}/${student.id.replace(/\D/g, '')}`,
    issueDate: new Date().toISOString().split('T')[0],
    reason: 'PERSONAL REASONS / HIGHER STUDIES',
    conduct: 'EXCELLENT',
    remarks: 'PROMOTED TO HIGHER CLASS',
    motherName: '',
    caste: '',
    category: '',
    religion: '',
    lastSchool: '',
    udisePen: '',
    mobileNumber: student.phone || '',
    studentAddress: student.address || ''
  });

  // Pattern fix constant
  const SVG_TEXTURE = "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.08' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E";

  // --- Calculations ---
  const studentFees = useMemo(() => fees.filter(f => f.studentId === student.id && !f.isDeleted), [fees, student.id]);
  
  const stats = useMemo(() => {
      const totalAgreed = student.totalAgreedFees || 0;
      const backLogs = student.backLogs || 0;
      const totalLiability = totalAgreed + backLogs;
      
      const paidFeesList = studentFees.filter(f => f.status === 'Paid');
      const paidTotal = paidFeesList.reduce((sum, f) => sum + f.amount, 0);
      
      const dueAmount = Math.max(0, totalLiability - paidTotal);
      
      const progress = totalLiability > 0 ? Math.round((paidTotal / totalLiability) * 100) : 0;
      
      let status = 'Unpaid';
      if (dueAmount <= 0 && totalLiability > 0) status = 'Paid';
      else if (paidTotal > 0) status = 'Partial';
      else if (totalLiability === 0) status = 'No Fees';

      const totalTransactions = paidFeesList.length;
      
      const sortedPaidFees = [...paidFeesList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPaymentAmount = sortedPaidFees.length > 0 ? sortedPaidFees[0].amount : 0;
      const lastPaymentDate = sortedPaidFees.length > 0 ? sortedPaidFees[0].date : null;

      return { 
          totalAgreed,
          totalLiability, 
          paidTotal, 
          dueAmount, 
          progress, 
          status, 
          totalTransactions, 
          lastPaymentAmount, 
          lastPaymentDate,
          backLogs
      };
  }, [studentFees, student.totalAgreedFees, student.backLogs]);

  const sortedFees = [...studentFees].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateStr: string | undefined | null) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // --- Communication Handlers ---
  const handleSendReminder = () => {
    if (!student.phone) {
        onNotify?.("❌ No phone number available for this student.", "error");
        return;
    }
    const message = `🔔 *FEE REMINDER* 🔔\n\nDear Parent,\nThis is a reminder regarding the pending fees for *${student.name}* (ID: ${student.id}, Class: ${student.grade}).\n\n💰 *Due Amount:* ${currency}${stats.dueAmount.toLocaleString()}\n📅 *Session:* ${student.session || schoolData.currentSession}\n\nPlease clear the outstanding balance at your earliest convenience.\n\nThank you,\n*${schoolData.name}*`;
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
    onNotify?.("🔔 Fee reminder generated!", "success");
  };

  const handleSendConfirmation = () => {
    if (!student.phone) {
        onNotify?.("❌ No phone number available for this student.", "error");
        return;
    }
    if (stats.totalTransactions === 0) {
        onNotify?.("❌ No successful payments found to confirm.", "error");
        return;
    }
    const message = `✅ *FEE PAYMENT RECEIVED* ✅\n\nDear Parent,\nWe have successfully received a payment for *${student.name}*.\n\n💵 *Amount Received:* ${currency}${stats.lastPaymentAmount.toLocaleString()}\n🗓️ *Date:* ${formatDate(stats.lastPaymentDate)}\n📊 *Total Paid This Session:* ${currency}${stats.paidTotal.toLocaleString()}\n⏳ *Remaining Balance:* ${currency}${stats.dueAmount.toLocaleString()}\n\nThank you for your cooperation!\n\nRegards,\n*${schoolData.name}*`;
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
    onNotify?.("✅ Payment confirmation sent!", "success");
  };

  const handleDownloadImage = async (elementId: string, filename: string) => {
    const card = document.getElementById(elementId);
    const html2canvas = (window as any).html2canvas;
    if (!card || !html2canvas) return;
    
    setIsGenerating(true);
    onNotify?.("Preparing high-quality document...", "info");

    try {
        const canvas = await html2canvas(card, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
        });
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        onNotify?.("Document downloaded successfully!", "success");
    } catch (err) {
        onNotify?.("Failed to generate document.", "error");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleShareImage = async (elementId: string, filename: string) => {
    const card = document.getElementById(elementId);
    const html2canvas = (window as any).html2canvas;
    if (!card || !html2canvas) return;

    setIsGenerating(true);
    try {
        const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        canvas.toBlob(async (blob: Blob | null) => {
            if (blob && navigator.share) {
                const file = new File([blob], `${filename}.png`, { type: 'image/png' });
                try {
                  await navigator.share({
                      files: [file],
                      title: filename,
                      text: `Official document for ${student.name} from ${schoolData.name}`
                  });
                } catch (shareErr: any) {
                  // Silently handle cancellation
                  if (shareErr.name !== 'AbortError') {
                    onNotify?.("Sharing failed.", "error");
                  }
                }
            } else {
                handleDownloadImage(elementId, filename);
            }
            setIsGenerating(false);
        });
    } catch (err) {
        onNotify?.("Rendering failed.", "error");
        setIsGenerating(false);
    }
  };

  const handleDeleteTrigger = () => {
      const hasPaidFees = studentFees.some(f => f.status === 'Paid');
      if (hasPaidFees) {
          setShowRestrictedModal(true);
      } else {
          setShowDeleteConfirm(true);
      }
  };

  const DetailRow = ({ icon, label, value, isLink = false, highlight = false }: { icon: string, label: string, value?: string, isLink?: boolean, highlight?: boolean }) => (
      <div className="flex items-start gap-3 text-sm">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg border shrink-0 mt-0.5 ${highlight ? 'bg-red-50 border-red-100 text-red-500' : 'bg-slate-50 border-slate-100'}`}>{icon}</span>
          <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-bold uppercase tracking-wide ${highlight ? 'text-red-400' : 'text-slate-400'}`}>{label}</p>
              {isLink && value ? (
                 <a href={`tel:${value}`} className="font-bold text-indigo-600 hover:underline truncate block">{value}</a>
              ) : (
                 <p className={`font-bold truncate ${highlight ? 'text-red-600' : 'text-slate-700'}`}>{value || 'N/A'}</p>
              )}
          </div>
      </div>
  );

  const getIDStyles = () => {
    switch(selectedDesign) {
        case 'Classic': return { bg: 'bg-slate-50', header: 'bg-indigo-900', text: 'text-slate-800', accent: 'border-indigo-600' };
        case 'Vibrant': return { bg: 'bg-pink-50', header: 'bg-gradient-to-r from-purple-600 to-pink-600', text: 'text-purple-900', accent: 'border-pink-500' };
        default: return { bg: 'bg-white', header: 'bg-gradient-to-br from-blue-600 to-indigo-700', text: 'text-slate-800', accent: 'border-blue-600' };
    }
  };

  const idStyles = getIDStyles();

  const handleTCTabClick = () => {
    if (stats.dueAmount > 0) {
        onNotify?.("Please clear all dues to generate Transfer Certificate", "error");
    } else {
        setActiveProfileTab('TC');
    }
  };

  return (
    <div className="animate-fade-in pb-12 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
        >
            <span>⬅️</span> Back
        </button>
        {isAdmin && (
            <div className="flex gap-2">
                <button 
                    onClick={() => onNavigateToEdit(student.id)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
                >
                    ✏️ Edit
                </button>
                <button 
                    onClick={() => setShowPromoteModal(true)}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors"
                >
                    🚀 Promote
                </button>
                <button 
                    onClick={handleDeleteTrigger}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                >
                    🗑️ Delete
                </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: BASIC PROFILE */}
          <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
                  <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBvcGFjaXR5PSIwLjEiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] opacity-30"></div>
                  </div>
                  
                  <div className="px-6 pb-6 relative">
                      <div className="flex justify-center -mt-14 mb-4">
                          <div className="w-28 h-28 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden flex items-center justify-center text-5xl relative z-10">
                              {student.photo ? (
                                  <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                  <span>{student.name.charAt(0)}</span>
                              )}
                          </div>
                      </div>
                      
                      <div className="text-center mb-8 border-b border-slate-50 pb-6">
                          <h2 className="text-2xl font-black text-slate-800 leading-tight">{student.name}</h2>
                          <div className="flex justify-center flex-wrap gap-2 mt-3">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                                  ID: {student.id}
                              </span>
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100">
                                  Class {student.grade}
                              </span>
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div>
                              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest mb-3">Contact Details</h4>
                              <div className="space-y-4">
                                  <DetailRow icon="👨‍👩‍👧‍👦" label="Guardian" value={student.parentName} />
                                  <DetailRow icon="📞" label="Phone" value={student.phone} isLink />
                                  <DetailRow icon="🏠" label="Address" value={student.address} />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                   <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">Academic Timeline</h3>
                   <div className="space-y-4">
                       <DetailRow icon="📅" label="Enrollment Date" value={formatDate(student.enrollmentDate)} />
                       <DetailRow icon="🎂" label="Date of Birth" value={formatDate(student.dob)} />
                       <DetailRow icon="🗓️" label="Academic Session" value={student.session || schoolData.currentSession} />
                   </div>
              </div>
          </div>

          {/* RIGHT COLUMN: DOCUMENT AREA & FEE STATUS */}
          <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden animate-slide-up">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
                      <div>
                          <h3 className="text-2xl font-black flex items-center gap-3">
                              <span className="p-2.5 bg-white/10 rounded-2xl text-2xl shadow-inner border border-white/10">💰</span>
                              <span>Fee Status Summary</span>
                          </h3>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 ml-14">Academic Session: {student.session || schoolData.currentSession}</p>
                      </div>
                      <div className="flex items-center gap-3">
                           <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-lg ${
                              stats.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              stats.status === 'Unpaid' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                              'bg-amber-500/20 text-amber-400 border-amber-500/30'
                           }`}>
                              {stats.status}
                           </span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
                      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                          <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1.5">Total Liability</p>
                          <p className="text-2xl font-black tracking-tight">{currency}{stats.totalLiability.toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-500/10 backdrop-blur-md rounded-3xl p-5 border border-emerald-500/10">
                          <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest mb-1.5">Total Paid</p>
                          <p className="text-2xl font-black text-emerald-400 tracking-tight">{currency}{stats.paidTotal.toLocaleString()}</p>
                      </div>
                      <div className="bg-rose-500/10 backdrop-blur-md rounded-3xl p-5 border border-rose-500/10">
                          <p className="text-[10px] text-rose-300 font-black uppercase tracking-widest mb-1.5">Net Dues</p>
                          <p className="text-2xl font-black text-rose-400 tracking-tight">{currency}{stats.dueAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-indigo-500/10 backdrop-blur-md rounded-3xl p-5 border border-indigo-500/10">
                          <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1.5">Last Pay</p>
                          <p className="text-xl font-black tracking-tight">{stats.lastPaymentAmount > 0 ? `${currency}${stats.lastPaymentAmount.toLocaleString()}` : 'None'}</p>
                      </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-end px-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                          <span className="text-xl font-black text-indigo-400">{stats.progress}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                          <div 
                              className={`h-full rounded-full transition-all duration-1000 shadow-lg ${stats.progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-700'}`} 
                              style={{ width: `${stats.progress}%` }}
                          ></div>
                      </div>
                  </div>

                  {/* NEW COMMUNICATION ACTIONS */}
                  {isAdmin && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 relative z-10 p-5 bg-black/20 rounded-[2rem] border border-white/5">
                        <button 
                            onClick={handleSendReminder}
                            disabled={stats.dueAmount <= 0}
                            className="flex items-center justify-center gap-3 py-3.5 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-900/20 hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                        >
                            <span className="text-base">🔔</span> Send Fees Reminder
                        </button>
                        <button 
                            onClick={handleSendConfirmation}
                            className="flex items-center justify-center gap-3 py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            <span className="text-base">✅</span> Submit Confirmation
                        </button>
                    </div>
                  )}

                  <div className="mt-8 flex flex-col sm:flex-row gap-4 relative z-10 pt-8 border-t border-white/10">
                       <button 
                          onClick={() => onNavigateToFees(student.id)}
                          className="flex-1 bg-white text-indigo-950 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                       >
                           <span>💸</span> {isAdmin ? 'Record Transaction' : 'Detailed History'}
                       </button>
                       {isAdmin && (
                           <button 
                             onClick={() => onNavigateToEdit(student.id)}
                             className="px-8 py-4 bg-white/10 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all active:scale-95"
                           >
                               Modify Profile
                           </button>
                       )}
                  </div>
              </div>

              {/* DOCUMENT TABS SECTION */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="bg-slate-50 p-2 flex border-b border-slate-200">
                      <button 
                        onClick={() => setActiveProfileTab('ID')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeProfileTab === 'ID' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          🪪 Identity Card
                      </button>
                      <button 
                        onClick={handleTCTabClick}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeProfileTab === 'TC' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          📜 Transfer Certificate
                      </button>
                  </div>

                  <div className="p-4 md:p-8 flex flex-col items-center">
                      {activeProfileTab === 'ID' ? (
                          <div className="animate-fade-in w-full flex flex-col items-center">
                              <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-xl">
                                  {(['Modern', 'Classic', 'Vibrant'] as const).map(d => (
                                      <button 
                                        key={d} 
                                        onClick={() => setSelectedDesign(d)}
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                                            selectedDesign === d ? 'bg-white border-white text-indigo-600 shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                      >
                                          {d}
                                      </button>
                                  ))}
                              </div>

                              <div id="student-id-card-render" className={`w-[300px] h-[520px] ${idStyles.bg} rounded-3xl shadow-2xl overflow-hidden relative flex flex-col border border-slate-100`}>
                                  <div className={`h-28 ${idStyles.header} p-4 flex items-center gap-3 relative`}>
                                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("${SVG_TEXTURE}")` }}></div>
                                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shrink-0 z-10 border-2 border-white/20">
                                          {schoolData.logo ? <img src={schoolData.logo} className="w-full h-full object-contain p-1" /> : '🏫'}
                                      </div>
                                      <div className="z-10 min-w-0 text-left">
                                          <h2 className="text-white font-black text-[15px] uppercase leading-tight truncate">{schoolData.name}</h2>
                                          {schoolData.motto && <p className="text-white/70 text-[11px] italic leading-tight truncate">"{schoolData.motto}"</p>}
                                          <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mt-0.5">Session: {student.session || schoolData.currentSession}</p>
                                      </div>
                                  </div>

                                  <div className="flex-1 flex flex-col items-center pt-8 px-6 pb-4 relative overflow-hidden">
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0">
                                          {schoolData.logo ? (
                                              <img src={schoolData.logo} className="w-64 h-64 object-contain grayscale" />
                                          ) : (
                                              <span className="text-[12rem]">🏫</span>
                                          )}
                                      </div>

                                      <div className={`w-24 h-24 rounded-2xl bg-white p-1 shadow-lg mt-6 z-20 border-2 ${idStyles.accent}`}>
                                          <div className="w-full h-full rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                                              {student.photo ? <img src={student.photo} className="w-full h-full object-cover" /> : <span className="text-4xl text-slate-300">{student.name.charAt(0)}</span>}
                                          </div>
                                      </div>

                                      <h3 className={`text-xl font-black ${idStyles.text} mt-2 text-center leading-tight relative z-10 uppercase tracking-tight`}>{student.name}</h3>
                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase rounded-full mt-1 border border-indigo-100 tracking-widest relative z-10">Student</span>

                                      <div className="w-full mt-2 space-y-0.5 flex-1 relative z-10 text-left">
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Student ID</span>
                                              <span className="text-[11px] font-black text-slate-700 font-mono">{student.id}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class</span>
                                              <span className="text-[11px] font-black text-slate-700">{student.grade}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Session</span>
                                              <span className="text-[11px] font-black text-slate-700">{student.session || schoolData.currentSession}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Guardian</span>
                                              <span className="text-[11px] font-black text-slate-700 truncate max-w-[120px]">{student.parentName}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</span>
                                              <span className="text-[11px] font-black text-slate-700">{student.phone || 'N/A'}</span>
                                          </div>
                                          <div className="flex flex-col pt-0.5">
                                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0">Address</span>
                                              <span className="text-[9px] font-bold text-slate-600 leading-tight line-clamp-2 uppercase">{student.address || 'N/A'}</span>
                                          </div>
                                      </div>

                                      <div className="flex justify-between items-end w-full mt-4 relative z-10">
                                          <div className="text-left">
                                              <div className="h-6 w-16 border-b-2 border-slate-300 mb-1"></div>
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
                                          </div>
                                          <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ID:${student.id}`} className="w-12 h-12" alt="QR" />
                                          </div>
                                      </div>
                                  </div>

                                  <div className="mt-auto w-full text-center bg-slate-50/50 border-t border-slate-100 pb-3 relative z-10">
                                     <div className="pt-3 mb-1.5">
                                        <p className="text-[11px] text-slate-500 font-black leading-tight mb-1 px-3 line-clamp-1 uppercase tracking-tight">{schoolData.address}</p>
                                        {schoolData.contactNumber && (
                                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Contact: {schoolData.contactNumber}</p>
                                        )}
                                     </div>
                                     <p className={`text-[10px] text-center font-black tracking-[0.3em] uppercase ${selectedDesign === 'Vibrant' ? 'text-pink-400' : 'text-slate-300'}`}>Identity Card</p>
                                  </div>
                              </div>

                              <div className="mt-8 flex gap-4">
                                  <button 
                                    onClick={() => handleDownloadImage('student-id-card-render', `ID_Card_${student.name}`)}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                  >
                                      Download Card
                                  </button>
                                  <button 
                                    onClick={() => handleShareImage('student-id-card-render', `ID_Card_${student.name}`)}
                                    className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                  >
                                      Share Card
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="animate-fade-in w-full space-y-10">
                               {isAdmin && (
                                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                       <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                           <span>✏️</span> Certificate Customization
                                       </h4>
                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">TC Number</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.tcNumber} onChange={e => setTcDetails({...tcDetails, tcNumber: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Issue Date</label>
                                                <input type="date" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.issueDate} onChange={e => setTcDetails({...tcDetails, issueDate: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Mother's Name</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.motherName} placeholder="Mother's Name" onChange={e => setTcDetails({...tcDetails, motherName: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Religion</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.religion} placeholder="e.g. Hindu" onChange={e => setTcDetails({...tcDetails, religion: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Caste</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.caste} placeholder="e.g. Brahmin" onChange={e => setTcDetails({...tcDetails, caste: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Category</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.category} placeholder="e.g. General / OBC" onChange={e => setTcDetails({...tcDetails, category: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Last School Attended</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.lastSchool} placeholder="Previous Institution" onChange={e => setTcDetails({...tcDetails, lastSchool: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">UDISE P.E.N</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.udisePen} placeholder="Personal Education Number" onChange={e => setTcDetails({...tcDetails, udisePen: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Mobile Number</label>
                                                <input type="tel" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.mobileNumber} onChange={e => setTcDetails({...tcDetails, mobileNumber: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Address</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.studentAddress} onChange={e => setTcDetails({...tcDetails, studentAddress: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Reason for leaving</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.reason} onChange={e => setTcDetails({...tcDetails, reason: e.target.value})} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">General Conduct</label>
                                                <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.conduct} onChange={e => setTcDetails({...tcDetails, conduct: e.target.value})}>
                                                    <option value="EXCELLENT">EXCELLENT</option>
                                                    <option value="GOOD">GOOD</option>
                                                    <option value="SATISFACTORY">SATISFACTORY</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase block ml-1">Remarks</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" value={tcDetails.remarks} onChange={e => setTcDetails({...tcDetails, remarks: e.target.value})} />
                                            </div>
                                       </div>
                                   </div>
                               )}

                               <div className="flex justify-center w-full">
                                    <div id="student-tc-render" className="w-full max-w-[800px] aspect-[1/1.41] bg-white border-[14px] border-double border-slate-200 p-10 flex flex-col relative shadow-2xl overflow-hidden">
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
                                            {schoolData.logo ? (
                                                <img src={schoolData.logo} className="w-[75%] object-contain grayscale" />
                                            ) : (
                                                <span className="text-[25rem]">🏫</span>
                                            )}
                                        </div>

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="text-center mb-5 border-b-2 border-slate-100 pb-4">
                                                <div className="flex items-center justify-center gap-4 mb-2">
                                                    <div className="w-16 h-16 shrink-0 bg-white rounded-xl shadow-sm p-1 border border-slate-100">
                                                        {schoolData.logo ? <img src={schoolData.logo} className="w-full h-full object-contain"/> : '🏫'}
                                                    </div>
                                                    <div className="text-left">
                                                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{schoolData.name}</h2>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">{schoolData.address}</p>
                                                        {schoolData.affiliationNumber && (
                                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Affiliation No: {schoolData.affiliationNumber}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center mb-6">
                                                <h1 className="text-2xl font-black text-rose-600 uppercase border-y-2 border-rose-100 py-2 tracking-[0.3em] inline-block px-10">Transfer Certificate</h1>
                                            </div>

                                            <div className="flex justify-between items-center mb-6 px-2 font-black text-[11px] text-slate-400 border-b border-slate-50 pb-2">
                                                <span className="uppercase tracking-[0.1em]">TC Number: <span className="text-slate-800 ml-1">{tcDetails.tcNumber}</span></span>
                                                <span className="uppercase tracking-[0.1em]">Date: <span className="text-slate-800 ml-1">{new Date(tcDetails.issueDate).toLocaleDateString()}</span></span>
                                            </div>

                                            <div className="space-y-1.5 text-[12px] leading-tight text-slate-800 font-medium">
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[9px] tracking-wider">1. Name of Pupil:</span>
                                                    <span className="font-black text-slate-900 uppercase text-sm">{student.name}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[9px] tracking-wider">2. Mother's Name:</span>
                                                    <span className="font-black text-slate-900 uppercase text-xs">{tcDetails.motherName || '---'}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[9px] tracking-wider">3. Father's / Guardian's:</span>
                                                    <span className="font-black text-slate-900 uppercase text-xs">{student.parentName}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="flex items-center border-b border-slate-50 pb-1">
                                                        <span className="w-24 shrink-0 font-black text-slate-400 uppercase text-[9px] tracking-wider">4. Religion:</span>
                                                        <span className="font-black text-slate-900 uppercase text-xs">{tcDetails.religion || '---'}</span>
                                                    </div>
                                                    <div className="flex items-center border-b border-slate-50 pb-1">
                                                        <span className="w-32 shrink-0 font-black text-slate-400 uppercase text-[9px] tracking-wider">5. Caste/Category:</span>
                                                        <span className="font-black text-slate-900 uppercase text-[10px] truncate flex-1 pl-2 border-l border-slate-50">{tcDetails.caste || '---'} {tcDetails.category ? `(${tcDetails.category})` : ''}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="flex items-center border-b border-slate-50 pb-1">
                                                        <span className="w-32 shrink-0 font-black text-slate-400 uppercase text-[9px] tracking-wider">6. Student ID:</span>
                                                        <span className="font-black text-slate-900 font-mono tracking-tight text-[11px]">{student.id}</span>
                                                    </div>
                                                    <div className="flex items-center border-b border-slate-50 pb-1">
                                                        <span className="w-24 shrink-0 font-black text-slate-400 uppercase text-[9px] tracking-wider">7. DOB:</span>
                                                        <span className="font-black text-slate-900 text-xs">{formatDate(student.dob)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[10px] tracking-wider">8. UDISE P.E.N:</span>
                                                    <span className="font-black text-slate-900 uppercase tracking-widest text-xs">{tcDetails.udisePen || '---'}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[10px] tracking-wider">9. Last School Attended:</span>
                                                    <span className="font-black text-slate-900 uppercase text-[11px] italic">{tcDetails.lastSchool || '---'}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[10px] tracking-wider">10. Academic Session:</span>
                                                    <span className="font-black text-slate-900 uppercase text-xs">{student.session || schoolData.currentSession}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[10px] tracking-wider">11. Class Studied:</span>
                                                    <span className="font-black text-slate-900 uppercase text-xs">{student.grade}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[10px] tracking-wider">12. Mobile Number:</span>
                                                    <span className="font-black text-slate-900 text-xs">{tcDetails.mobileNumber}</span>
                                                </div>
                                                <div className="flex flex-col border-b border-slate-50 pb-2 pt-1">
                                                    <span className="font-black text-slate-400 uppercase text-[9px] tracking-wider mb-1">13. Residential Address:</span>
                                                    <span className="font-black text-slate-800 italic text-[10px] leading-tight pl-3 border-l-2 border-indigo-100 uppercase bg-slate-50/20 p-1.5 rounded-r-md">{tcDetails.studentAddress || '---'}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[10px] tracking-wider">14. Reason for leaving:</span>
                                                    <span className="font-black italic text-rose-600 uppercase text-[11px] border-b border-rose-100">{tcDetails.reason}</span>
                                                </div>
                                                <div className="flex items-center border-b border-slate-50 pb-1">
                                                    <span className="w-52 shrink-0 font-black text-slate-400 uppercase text-[10px] tracking-wider">15. General Conduct:</span>
                                                    <span className="font-black text-emerald-600 uppercase text-xs">{tcDetails.conduct}</span>
                                                </div>
                                            </div>

                                            <div className="mt-auto flex justify-between items-end pt-8 pb-4">
                                                <div className="text-center w-40">
                                                    <div className="w-full h-px bg-slate-300 mb-1.5 mx-auto"></div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Office Registrar</p>
                                                </div>
                                                <div className="text-center w-40 relative">
                                                    {schoolData.authorizedSignature && (
                                                        <img src={schoolData.authorizedSignature} className="h-12 w-auto mx-auto mb-1 opacity-90 absolute bottom-6 left-1/2 -translate-x-1/2" />
                                                    )}
                                                    <div className="w-full h-px bg-slate-300 mb-1.5 mx-auto"></div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Principal / Head</p>
                                                </div>
                                            </div>

                                            <div className="mt-2 text-center border-t border-slate-50 pt-3">
                                                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em] opacity-60">Verified Institutional Academic Transcript</p>
                                            </div>
                                        </div>
                                    </div>
                               </div>

                               <div className="flex justify-center gap-4">
                                    <button 
                                        onClick={() => handleDownloadImage('student-tc-render', `TC_${student.name}`)}
                                        className="px-10 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <span>📥</span> Download TC (A4)
                                    </button>
                                    <button 
                                        onClick={() => handleShareImage('student-tc-render', `TC_${student.name}`)}
                                        className="px-10 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <span>🔗</span> Share PDF
                                    </button>
                               </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* MODALS */}
      {showRestrictedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm text-center animate-scale-in border border-slate-100">
                <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-rose-100">🚫</div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Access Blocked</h3>
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    This student profile cannot be removed because active fee records exist. Maintain financial integrity by clearing records first.
                </p>
                <button onClick={() => setShowRestrictedModal(false)} className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all">Dismiss</button>
            </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-sm text-center">
                 <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🗑️</div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Student?</h3>
                 <p className="text-slate-500 text-sm mb-6">Are you sure you want to move <strong>{student.name}</strong> to the Recycle Bin?</p>
                 <div className="flex gap-3">
                     <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg">Cancel</button>
                     <button onClick={() => { onDelete(student.id); setShowDeleteConfirm(false); }} className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg">Delete</button>
                 </div>
             </div>
        </div>
      )}

      {showPromoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md animate-scale-in border border-slate-100">
                <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-emerald-100">🚀</div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight text-center">Promote Student</h3>
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed text-center">
                    Copy <strong>{student.name}</strong>'s details to a new session. This will create a new record for the selected session.
                </p>
                
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Session</label>
                        <select 
                            value={promoteData.session}
                            onChange={(e) => setPromoteData(prev => ({ ...prev, session: e.target.value }))}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="">Select Session</option>
                            {schoolData.sessions.filter(s => s !== student.session).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Grade/Class</label>
                        <select 
                            value={promoteData.grade}
                            onChange={(e) => setPromoteData(prev => ({ ...prev, grade: e.target.value }))}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="">Select Class</option>
                            {allClasses.map(c => (
                                <option key={c} value={c}>🏫 {c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowPromoteModal(false)} 
                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if (!promoteData.session) {
                                onNotify?.("Please select a target session", "error");
                                return;
                            }
                            if (!promoteData.grade) {
                                onNotify?.("Please select a target grade/class", "error");
                                return;
                            }
                            setShowPromoteConfirm(true);
                        }} 
                        className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                    >
                        Confirm Promote
                    </button>
                </div>
            </div>
        </div>
      )}

      {showPromoteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-md animate-scale-in border border-slate-100 text-center">
                <div className="w-24 h-24 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-5xl mx-auto mb-8 shadow-xl shadow-indigo-100 animate-bounce-slow">❓</div>
                <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Are you sure?</h3>
                <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-left space-y-3 border border-slate-100">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</span>
                        <span className="text-sm font-black text-slate-700">{student.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father's Name</span>
                        <span className="text-sm font-black text-slate-700">{student.parentName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Class</span>
                        <span className="text-sm font-black text-indigo-600">🏫 {promoteData.grade}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Session</span>
                        <span className="text-sm font-black text-emerald-600">📅 {promoteData.session}</span>
                    </div>
                </div>
                
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    Do you want to promote this student with the above details?
                </p>

                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowPromoteConfirm(false)} 
                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                    >
                        No, Cancel
                    </button>
                    <button 
                        onClick={() => {
                            onPromote?.(student, promoteData.session, promoteData.grade);
                            setShowPromoteConfirm(false);
                            setShowPromoteModal(false);
                        }} 
                        className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        Yes, Promote
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;