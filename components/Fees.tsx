import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FeeRecord, Student, SchoolProfileData } from '../types';
import { submitToFormspree } from '../lib/formspree';

interface FeesProps {
  fees: FeeRecord[];
  students: Student[];
  classes: string[];
  feeCategories: string[];
  schoolProfile: SchoolProfileData;
  currency: string;
  onAddFee: (fee: Omit<FeeRecord, 'id' | 'isDeleted'>) => void;
  onUpdateFee: (fee: FeeRecord) => void;
  onDeleteFee: (id: string) => void;
  onUpdateFeeStatus: (id: string, status: FeeRecord['status']) => void;
  initialStudentId?: string | null;
  userRole?: 'ADMIN' | 'STUDENT';
}

const Fees: React.FC<FeesProps> = ({ 
  fees, 
  students, 
  classes, 
  feeCategories, 
  schoolProfile,
  currency,
  onAddFee, 
  onUpdateFee,
  onDeleteFee, 
  onUpdateFeeStatus,
  initialStudentId,
  userRole = 'ADMIN'
}) => {
  const isAdmin = userRole === 'ADMIN';
  const isStudent = userRole === 'STUDENT';

  // Pattern fix constant
  const SVG_TEXTURE = "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.08' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E";

  // --- State Management ---
  const [selectedClassForForm, setSelectedClassForForm] = useState('');
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [activeFeeId, setActiveFeeId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newFeeIds, setNewFeeIds] = useState<string[]>([]);
  const prevFeesRef = useRef<FeeRecord[]>(fees);

  const [viewReceiptFee, setViewReceiptFee] = useState<FeeRecord | null>(null);
  const [feeToDelete, setFeeToDelete] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const [formData, setFormData] = useState({
    studentId: initialStudentId || '',
    amount: 0,
    type: 'Tuition',
    status: 'Paid' as FeeRecord['status'],
    paymentMethod: 'Cash' as 'Cash' | 'UPI' | 'Online' | 'Bank Transfer' | 'Cheque',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (initialStudentId) {
      const student = students.find(s => s.id === initialStudentId);
      if (student) {
        setSelectedClassForForm(student.grade);
        setFormData(prev => ({ ...prev, studentId: initialStudentId }));
        if (isAdmin) setIsPaymentFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [initialStudentId, students, isAdmin]);

  useEffect(() => {
      const prevFees = prevFeesRef.current;
      const added = fees.filter(f => !f.isDeleted && !prevFees.find(p => p.id === f.id));
      
      if (added.length > 0) {
          const addedIds = added.map(f => f.id);
          setNewFeeIds(prev => [...prev, ...addedIds]);
          setTimeout(() => {
              setNewFeeIds(prev => prev.filter(id => !addedIds.includes(id)));
          }, 5000);
      }
      prevFeesRef.current = fees;
  }, [fees]);

  // --- Derived Data & Calculations ---
  const availableStudents = useMemo(() => students.filter(s => 
    !s.isDeleted && (!selectedClassForForm || s.grade === selectedClassForForm)
  ), [students, selectedClassForForm]);

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === formData.studentId), 
    [formData.studentId, students]
  );

  useEffect(() => {
    if (formData.studentId && isAdmin) {
      setIsPaymentFormOpen(true);
    }
  }, [formData.studentId, isAdmin]);

  const studentStats = useMemo(() => {
    if (!selectedStudent) return null;
    const totalAgreed = selectedStudent.totalAgreedFees || 0;
    const backLogs = selectedStudent.backLogs || 0;
    const totalFee = totalAgreed + backLogs;
    const paidFees = fees
      .filter(f => f.studentId === selectedStudent.id && !f.isDeleted && f.status === 'Paid')
      .reduce((sum, f) => sum + f.amount, 0);
    const dueFees = totalFee - paidFees;
    const paidPercentage = totalFee > 0 ? Math.round((paidFees / totalFee) * 100) : 0;
    let statusLabel = 'Unpaid';
    if (paidPercentage >= 100) statusLabel = 'Paid';
    else if (paidPercentage > 0) statusLabel = 'Partial';
    return { totalFee, paidFees, dueFees, paidPercentage, statusLabel, backLogs };
  }, [selectedStudent, fees]);

  const filteredHistory = useMemo(() => {
    return fees.filter(f => {
      if (f.isDeleted) return false;
      // CRITICAL: Student role only sees their own fees
      const effectiveStudentId = isStudent ? initialStudentId : formData.studentId;
      if (effectiveStudentId && f.studentId !== effectiveStudentId) return false;
      
      if (dateRange.start && f.date < dateRange.start) return false;
      if (dateRange.end && f.date > dateRange.end) return false;
      if (f.status !== 'Paid') return false;

      // New: Search Filter by Student Name
      if (historySearchTerm) {
          const student = students.find(s => s.id === f.studentId);
          if (!student?.name.toLowerCase().includes(historySearchTerm.toLowerCase())) {
              return false;
          }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fees, dateRange, formData.studentId, isStudent, initialStudentId, historySearchTerm, students]);

  const historyStats = useMemo(() => {
    const totalReceived = filteredHistory.reduce((sum, f) => sum + f.amount, 0);
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todaysCollection = filteredHistory
        .filter(f => f.date === todayStr)
        .reduce((sum, f) => sum + f.amount, 0);
    return { count: filteredHistory.length, totalReceived, todaysCollection };
  }, [filteredHistory]);

  const receiptTransactions = useMemo(() => {
    if (!viewReceiptFee) return [];
    return fees
      .filter(f => f.studentId === viewReceiptFee.studentId && !f.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fees, viewReceiptFee]);

  const receiptStudent = useMemo(() => 
    students.find(s => s.id === viewReceiptFee?.studentId),
    [students, viewReceiptFee]
  );

  const receiptStats = useMemo(() => {
      if (!viewReceiptFee || !receiptStudent) return { totalFee: 0, paidFees: 0, dueFees: 0 };
      const totalAgreed = receiptStudent.totalAgreedFees || 0;
      const backLogs = receiptStudent.backLogs || 0;
      const totalFee = totalAgreed + backLogs;
      const paidFees = fees
        .filter(f => f.studentId === viewReceiptFee.studentId && !f.isDeleted && f.status === 'Paid')
        .reduce((sum, f) => sum + f.amount, 0);
      const dueFees = totalFee - paidFees;
      return { totalFee, paidFees, dueFees };
  }, [fees, viewReceiptFee, receiptStudent]);

  // --- Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) return;
    const student = students.find(s => s.id === formData.studentId);
    
    const submissionData = {
        ...formData,
        student_name: student?.name,
        student_class: student?.grade,
        parent_name: student?.parentName,
        student_phone: student?.phone,
        school_name: schoolProfile.name,
        session: schoolProfile.currentSession,
        update_mode: !!editingId
    };

    await submitToFormspree(editingId ? 'Edit Fee Record' : 'Fee Payment Form', submissionData);
    
    if (editingId) {
      onUpdateFee({ ...formData, id: editingId, isDeleted: false, session: schoolProfile.currentSession });
    } else {
      onAddFee(formData);
    }
    
    resetForm();
  };

  const handleClear = () => {
    setFormData({
        studentId: isStudent ? (initialStudentId || '') : '',
        amount: 0,
        type: feeCategories[0] || 'Tuition',
        status: 'Paid',
        paymentMethod: 'Cash',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    setEditingId(null);
    if (!isStudent) setSelectedClassForForm('');
  };

  const resetForm = () => {
    handleClear();
    setIsPaymentFormOpen(false);
  };

  const handleViewReceipt = (fee: FeeRecord) => {
      setViewReceiptFee(fee);
  };

  const handleDeleteConfirm = () => {
    if (feeToDelete) {
        onDeleteFee(feeToDelete);
        setFeeToDelete(null);
    }
  };

  const handleQuickSave = async () => {
      const receiptContent = document.querySelector('.receipt-paper') as HTMLElement;
      if (receiptContent && (window as any).html2canvas) {
          try {
              const canvas = await (window as any).html2canvas(receiptContent, {
                  scale: 2,
                  useCORS: true,
                  backgroundColor: '#ffffff'
              });
              const image = canvas.toDataURL("image/png");
              const link = document.createElement('a');
              link.href = image;
              link.download = `Receipt_${viewReceiptFee?.id || 'Transaction'}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } catch (error) {
              console.error("Receipt generation failed", error);
          }
      }
  };

  const handleQuickShare = async () => {
      if (!viewReceiptFee || !receiptStudent) return;
      const receiptContent = document.querySelector('.receipt-paper') as HTMLElement;
      if (!receiptContent || !(window as any).html2canvas) return;

      setIsSharing(true);
      try {
          const canvas = await (window as any).html2canvas(receiptContent, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff'
          });

          const shareDataText = {
              title: `Fee Receipt - ${receiptStudent.name}`,
              text: `🧾 Fee Receipt\n\nStudent: ${receiptStudent.name}\nAmount: ${currency}${viewReceiptFee.amount.toLocaleString()}\nDate: ${viewReceiptFee.date}\nTransaction ID: #${viewReceiptFee.id}\n\nSchool: ${schoolProfile.name}`,
          };

          if (navigator.canShare && canvas.toBlob) {
              canvas.toBlob(async (blob: Blob | null) => {
                  if (blob) {
                      const file = new File([blob], `Receipt_${viewReceiptFee.id}.png`, { type: 'image/png' });
                      const shareDataFile = {
                          ...shareDataText,
                          files: [file]
                      };

                      if (navigator.canShare(shareDataFile)) {
                          try {
                              await navigator.share(shareDataFile);
                          } catch (err: any) {
                              if (err.name !== 'AbortError') {
                                console.log('File sharing failed', err);
                              }
                          }
                      } else {
                          // Fallback to text sharing if file sharing not supported
                          if (navigator.share) {
                            try {
                              await navigator.share(shareDataText);
                            } catch (err: any) {
                              if (err.name !== 'AbortError') console.log('Text sharing failed', err);
                            }
                          }
                      }
                  }
                  setIsSharing(false);
              }, 'image/png');
          } else if (navigator.share) {
              try {
                await navigator.share(shareDataText);
              } catch (err: any) {
                if (err.name !== 'AbortError') console.log('Link sharing failed', err);
              }
              setIsSharing(false);
          } else {
              try {
                  await navigator.clipboard.writeText(shareDataText.text);
                  alert("✅ Receipt summary copied to clipboard!");
              } catch (err) {}
              setIsSharing(false);
          }
      } catch (error) {
          console.error("Receipt sharing failed", error);
          setIsSharing(false);
      }
  };

  const getFeeIcon = (type: string) => {
    switch(type) {
      case 'Tuition': return '🎓';
      case 'Bus': return '🚌';
      case 'Books': return '📚';
      case 'Uniform': return '👔';
      default: return '🧾';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch(method) {
      case 'Cash': return '💵';
      case 'UPI': return '📱';
      case 'Online': return '🌐';
      case 'Bank Transfer': return '🏦';
      case 'Cheque': return '🎫';
      default: return '💰';
    }
  };

  const getMethodColor = (method: string) => {
    switch(method) {
      case 'Cash': return 'emerald';
      case 'UPI': return 'indigo';
      case 'Online': return 'blue';
      case 'Bank Transfer': return 'amber';
      case 'Cheque': return 'rose';
      default: return 'slate';
    }
  };

  const getMethodBg = (method: string) => {
    switch(method) {
      case 'Cash': return 'from-emerald-500/10 via-emerald-500/5 to-transparent';
      case 'UPI': return 'from-indigo-500/10 via-indigo-500/5 to-transparent';
      case 'Online': return 'from-blue-500/10 via-blue-500/5 to-transparent';
      case 'Bank Transfer': return 'from-amber-500/10 via-amber-500/5 to-transparent';
      case 'Cheque': return 'from-rose-500/10 via-rose-500/5 to-transparent';
      default: return 'from-slate-500/10 via-slate-500/5 to-transparent';
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 flex items-center gap-3">
              <span>Fees Manager</span>
              <span>💰</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {isAdmin ? 'Manage student payments and track financial inflow.' : 'Track your fee payments and history.'}
          </p>
        </div>
      </header>

      {/* --- PAYMENT RECORD FORM (ADMIN ONLY) --- */}
      {isAdmin && (
          <div className="mb-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative transition-all">
                 <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50/50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                 
                 <div 
                    onClick={() => setIsPaymentFormOpen(!isPaymentFormOpen)}
                    className="px-8 py-5 relative z-10 flex items-center justify-between cursor-pointer group bg-gradient-to-r from-emerald-950 via-teal-900 to-indigo-950 transition-all select-none border-b border-white/5 hover:shadow-2xl"
                 >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            {editingId ? '✏️' : '✨'}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white leading-tight">
                              {editingId ? 'Update Record' : 'Record Payment'}
                            </h3>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] opacity-80">
                              {editingId ? 'Modifying existing entry' : 'New Transaction Entry'}
                            </p>
                        </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-all duration-300 ${isPaymentFormOpen ? 'rotate-180 shadow-lg' : ''}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                 </div>

                 <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isPaymentFormOpen ? 'max-h-[2500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                     <div className="px-8 py-6 bg-slate-50/80 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 backdrop-blur-md">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] block ml-1">Class Selection</label>
                            <select 
                                className="w-full h-14 pl-4 pr-10 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
                                value={selectedClassForForm}
                                onChange={e => {
                                    setSelectedClassForForm(e.target.value);
                                    setFormData(prev => ({ ...prev, studentId: '' }));
                                }}
                            >
                                <option value="">Choose Class...</option>
                                {classes.map(c => <option key={c} value={c}>🏫 {c}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] block ml-1">Student Lookup</label>
                            <select 
                                required 
                                className={`w-full h-14 pl-4 pr-10 border rounded-2xl font-black outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm ${
                                    formData.studentId ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-400'
                                }`}
                                value={formData.studentId} 
                                onChange={e => setFormData({...formData, studentId: e.target.value})}
                                disabled={!selectedClassForForm || availableStudents.length === 0}
                            >
                                <option value="">
                                    {!selectedClassForForm ? 'Select Class first...' : availableStudents.length === 0 ? 'No results found' : 'Pick student...'}
                                </option>
                                {availableStudents.map(s => <option key={s.id} value={s.id}>🎓 {s.name}</option>)}
                            </select>
                         </div>
                     </div>

                     <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/40 p-10 pt-8">
                               <div className="space-y-8">
                                   <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl shadow-sm">👤</div>
                                       <h3 className="text-xl font-black text-slate-800">Payer Summary</h3>
                                   </div>
                                   <div className={`transition-all duration-700 ${selectedStudent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                                        {selectedStudent && studentStats && (
                                           <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 space-y-6 relative group/profile">
                                                <div className="absolute top-6 right-6">
                                                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border ${
                                                        studentStats.statusLabel === 'Paid' ? 'bg-emerald-500 text-white border-emerald-400' :
                                                        studentStats.statusLabel === 'Partial' ? 'bg-amber-500 text-white border-amber-400' :
                                                        'bg-rose-500 text-white border-rose-400'
                                                    }`}>
                                                        {studentStats.statusLabel}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-5">
                                                     <div className="w-20 h-20 rounded-3xl bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-3xl shrink-0 group-hover/profile:scale-105 transition-transform duration-500">
                                                         {selectedStudent.photo ? <img src={selectedStudent.photo} className="w-full h-full object-cover" /> : selectedStudent.name.charAt(0)}
                                                     </div>
                                                     <div className="min-w-0 pr-16">
                                                         <h4 className="text-2xl font-black text-slate-800 truncate leading-tight">{selectedStudent.name}</h4>
                                                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">Class {selectedStudent.grade}</p>
                                                         <p className="text-xs font-bold text-indigo-600 mt-2 truncate flex items-center gap-2">
                                                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                             {selectedStudent.parentName}
                                                         </p>
                                                     </div>
                                                </div>

                                                <div className="bg-slate-50/80 rounded-[1.5rem] p-5 border border-slate-100 shadow-inner">
                                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-50">
                                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1 text-center">Total Expected</p>
                                                            <p className="text-sm font-black text-slate-800 text-center">{currency}{studentStats.totalFee.toLocaleString()}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-50">
                                                            <p className="text-[8px] text-amber-500 font-black uppercase tracking-widest mb-1 text-center">Back Fees</p>
                                                            <p className="text-sm font-black text-amber-600 text-center">{currency}{studentStats.backLogs.toLocaleString()}</p>
                                                        </div>
                                                        <div className="bg-emerald-50 p-3 rounded-2xl shadow-sm border border-emerald-100">
                                                            <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mb-1 text-center">Total Paid</p>
                                                            <p className="text-sm font-black text-emerald-700 text-center">{currency}{studentStats.paidFees.toLocaleString()}</p>
                                                        </div>
                                                         <div className="bg-rose-50 p-3 rounded-2xl shadow-sm border border-rose-100">
                                                            <p className="text-[8px] text-rose-400 font-black uppercase tracking-widest mb-1 text-center">Net Balance</p>
                                                            <p className="text-sm font-black text-rose-700 text-center">{currency}{studentStats.dueFees.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center mb-2 px-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Payment Efficiency</span>
                                                        <span className="text-xs font-black text-indigo-600">{studentStats.paidPercentage}%</span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner p-0.5">
                                                        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-700 rounded-full transition-all duration-1000 animate-bar-glow shadow-lg shadow-indigo-100" style={{ width: `${studentStats.paidPercentage}%` }}></div>
                                                    </div>
                                                </div>
                                           </div>
                                        )}
                                   </div>
                               </div>
                          </div>

                          <div className="lg:col-span-7 bg-gradient-to-bl from-emerald-50/40 via-white to-teal-50/40 p-10 pt-8">
                               <div className="space-y-8">
                                   <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xl shadow-sm">{currency}</div>
                                       <h3 className="text-xl font-black text-slate-800">Transaction Input</h3>
                                   </div>
                                   
                                   <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl focus-within:border-emerald-500/50 transition-all group/amount relative">
                                        <div className="absolute -top-3 left-8 bg-white px-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entering Amount</div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-5xl font-black text-slate-200 group-focus-within/amount:text-emerald-500 transition-colors drop-shadow-sm">{currency}</span>
                                            <input 
                                                type="number" required min="0" placeholder="0.00"
                                                className="w-full bg-transparent text-7xl font-black text-slate-900 outline-none placeholder:text-slate-100 tracking-tighter"
                                                value={formData.amount || ''}
                                                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                                            />
                                        </div>
                                   </div>

                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                       <div className="space-y-2">
                                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Category</label>
                                           <select 
                                                className="w-full h-14 p-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                                                value={formData.type}
                                                onChange={e => setFormData({...formData, type: e.target.value as any})}
                                           >
                                               {feeCategories.map(t => <option key={t} value={t}>{getFeeIcon(t)} {t}</option>)}
                                           </select>
                                       </div>
                                       <div className="space-y-2">
                                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                                           <input 
                                                type="date" required 
                                                className="w-full h-14 p-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                                                value={formData.date}
                                                onChange={e => setFormData({...formData, date: e.target.value})}
                                           />
                                       </div>
                                   </div>

                                   <div>
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Select Payment Mode</label>
                                       <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                           {['Cash', 'UPI', 'Online', 'Bank', 'Cheque'].map(mode => (
                                               <button
                                                    key={mode} type="button"
                                                    onClick={() => setFormData({...formData, paymentMethod: (mode === 'Bank' ? 'Bank Transfer' : mode) as any})}
                                                    className={`flex flex-col items-center justify-center gap-2 h-20 rounded-[1.5rem] border-2 transition-all group/mode ${
                                                        formData.paymentMethod === (mode === 'Bank' ? 'Bank Transfer' : mode)
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105 z-20'
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200 hover:text-emerald-600'
                                                    }`}
                                               >
                                                   <span className="text-2xl group-hover/mode:scale-110 transition-transform">{getPaymentMethodIcon(mode)}</span>
                                                   <span className="text-[9px] font-black uppercase tracking-widest">{mode}</span>
                                               </button>
                                           ))}
                                       </div>
                                   </div>

                                   <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={handleClear} className="px-8 py-5 bg-white text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-50 hover:text-rose-600 border border-slate-100 transition-all active:scale-95">Clear</button>
                                        <button 
                                            type="submit" disabled={!formData.studentId || formData.amount <= 0}
                                            className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            {editingId ? 'Update Transaction' : 'Finalize Transaction'}
                                        </button>
                                   </div>
                               </div>
                          </div>
                     </div>
                 </div>
            </form>
          </div>
      )}

      {/* --- HISTORY SECTION --- */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 mb-6 animate-fade-in">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner border border-indigo-100">
                    📜
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800">
                        {isStudent ? 'My Payment Records' : (formData.studentId ? `${selectedStudent?.name}'s Records` : 'Global Collection Log')}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction History & Audits</p>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 justify-end">
                {/* Search Bar Addition */}
                {!isStudent && !formData.studentId && (
                    <div className="relative flex-1 max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                            <span className="text-lg">🔍</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search by student name..." 
                            className="w-full h-12 pl-11 pr-10 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                            value={historySearchTerm}
                            onChange={(e) => setHistorySearchTerm(e.target.value)}
                        />
                        {historySearchTerm && (
                            <button 
                                onClick={() => setHistorySearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner shrink-0">
                    <input 
                        type="date" className="bg-white border-0 rounded-xl text-[10px] font-black text-slate-600 outline-none px-4 py-2.5 shadow-sm"
                        value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    />
                    <span className="text-slate-300 font-black text-xs">TO</span>
                    <input 
                        type="date" className="bg-white border-0 rounded-xl text-[10px] font-black text-slate-600 outline-none px-4 py-2.5 shadow-sm"
                        value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    />
                </div>
            </div>
        </div>
        
        <div className="mt-8 overflow-hidden">
             {/* --- MINI PREMIUM GLOWING COLLECTION BANNER --- */}
             <div className="mb-4 relative group">
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl shadow-xl transition-transform duration-700 group-hover:scale-[1.005]"></div>
                 <div className="absolute inset-0 opacity-10 rounded-2xl" style={{ backgroundImage: `url("${SVG_TEXTURE}")` }}></div>
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-50/20 via-purple-500/20 to-blue-500/20 rounded-[1.1rem] blur-lg opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity"></div>
                 
                 <div className="relative p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 bg-white/10 backdrop-blur-3xl rounded-xl flex items-center justify-center text-xl border border-white/20 shadow-2xl text-white shrink-0 animate-pulse">
                            💰
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-0.5 drop-shadow-sm flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping"></span>
                                Total {isStudent ? 'Paid' : 'Collection'}
                            </p>
                            <h4 className="text-2xl font-black text-white tracking-tighter drop-shadow-2xl flex items-baseline gap-1">
                                <span className="text-sm opacity-40 font-bold">{currency}</span>
                                {historyStats.totalReceived.toLocaleString()}
                            </h4>
                        </div>
                    </div>
                    
                    <div className="h-8 w-px bg-white/10 hidden sm:block"></div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-0.5">Today</p>
                            <div className="flex items-center justify-end gap-2">
                                <p className="text-lg font-black text-white tracking-tight">
                                    <span className="text-[10px] opacity-40 mr-0.5">{currency}</span>
                                    {historyStats.todaysCollection.toLocaleString()}
                                </p>
                                <div className="w-8 h-8 bg-emerald-500/10 backdrop-blur-2xl rounded-lg flex items-center justify-center text-lg border border-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/10">
                                    📈
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
             </div>

            {/* --- REDESIGNED FROSTED HISTORY CARDS WITH MAX NAME VISIBILITY --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[800px] overflow-y-auto pr-3 scrollbar-hide py-4 px-1">
                 {filteredHistory.length > 0 ? (
                    filteredHistory.map(fee => {
                        const student = students.find(s => s.id === fee.studentId);
                        const isActive = activeFeeId === fee.id;
                        const mColor = getMethodColor(fee.paymentMethod || 'Cash');
                        const mGradient = getMethodBg(fee.paymentMethod || 'Cash');
                        
                        return (
                            <div 
                                key={fee.id} onClick={() => setActiveFeeId(isActive ? null : fee.id)}
                                className={`group relative bg-white rounded-[1.5rem] p-5 border-2 transition-all duration-500 cursor-pointer overflow-hidden ${
                                    isActive 
                                    ? 'border-indigo-600 shadow-2xl scale-[1.05] z-30' 
                                    : 'border-slate-50 shadow-lg hover:border-indigo-100 hover:shadow-2xl hover:-translate-y-1'
                                }`}
                            >
                                {/* Dynamic Gradient Background Layer */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${mGradient} opacity-50 transition-opacity duration-500 group-hover:opacity-100`}></div>

                                {/* Floating Background Icon */}
                                <div className={`absolute -bottom-4 -right-4 opacity-[0.05] text-8xl pointer-events-none group-hover:scale-125 transition-transform duration-1000 rotate-12`}>
                                    {getFeeIcon(fee.type)}
                                </div>

                                {/* Side color bar */}
                                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${mColor}-500/40 group-hover:bg-${mColor}-500 transition-colors duration-500 shadow-[2px_0_10px_rgba(0,0,0,0.05)]`}></div>

                                <div className="relative pl-2 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            {/* STUDENT NAME - EXTREMELY PROMINENT */}
                                            <h5 className="font-black text-slate-900 text-3xl leading-[1] truncate pr-1 group-hover:text-indigo-900 transition-colors tracking-tighter uppercase">
                                                {student?.name || 'Archived User'}
                                            </h5>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-${mColor}-100 text-${mColor}-700 border border-${mColor}-200 uppercase tracking-widest shadow-sm`}>
                                                    {getPaymentMethodIcon(fee.paymentMethod || 'Cash')} {fee.paymentMethod || 'Cash'}
                                                </span>
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-white/60 backdrop-blur-sm text-slate-400 border border-slate-100 uppercase tracking-widest">
                                                    {fee.type}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border border-white flex items-center justify-center text-xl shadow-lg shrink-0 group-hover:rotate-12 transition-transform duration-300">
                                            {getFeeIcon(fee.type)}
                                        </div>
                                    </div>

                                    <div className="bg-white/40 backdrop-blur-md rounded-2xl p-4 border border-white/60 group-hover:bg-white/80 transition-colors duration-500 shadow-inner">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Receipt Total</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-sm font-black text-${mColor}-400`}>{currency}</span>
                                            <span className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-800 transition-colors">
                                                {fee.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 border-dashed">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Entry Date</span>
                                            <span className="text-[11px] font-black text-slate-600">
                                                {new Date(fee.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full bg-${mColor}-50 text-${mColor}-600 flex items-center justify-center text-xs shadow-sm ring-4 ring-${mColor}-50/50 group-hover:animate-bounce`}>
                                            ✅
                                        </div>
                                    </div>
                                </div>

                                {/* Action Layer - Only for Admins */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-white/20 backdrop-blur-3xl rounded-[1.5rem] flex flex-col items-center justify-center gap-5 animate-fade-in z-40 p-4 border border-white/50 shadow-2xl">
                                        <div className="flex items-center gap-3">
                                            {isAdmin && (
                                                <button 
                                                    onClick={(e) => { 
                                                      e.stopPropagation(); 
                                                      setEditingId(fee.id);
                                                      setFormData({studentId: fee.studentId, amount: fee.amount, type: fee.type as any, status: fee.status, paymentMethod: fee.paymentMethod || 'Cash', date: fee.date, description: fee.description || ''}); 
                                                      setIsPaymentFormOpen(true); 
                                                      window.scrollTo({top: 0, behavior: 'smooth'}); 
                                                    }} 
                                                    className="w-12 h-12 rounded-2xl bg-amber-500 text-white shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all border border-amber-400/50" 
                                                    title="Edit Entry"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleViewReceipt(fee); }} 
                                                className="w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-2xl flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all border-4 border-indigo-400/30" 
                                                title="Full Receipt"
                                            >
                                                🧾
                                            </button>
                                            {isAdmin && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setFeeToDelete(fee.id); }} 
                                                    className="w-12 h-12 rounded-2xl bg-rose-600 text-white shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all border border-rose-400/50" 
                                                    title="Void Record"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[9px] font-black text-indigo-950 uppercase tracking-[0.4em] opacity-60">Entry Control</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                 ) : (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 rounded-[4rem] bg-slate-50/50">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl shadow-xl border border-slate-100 mb-6 animate-pulse">📭</div>
                        <p className="font-black text-2xl text-slate-400 uppercase tracking-[0.2em]">Archive Empty</p>
                        <p className="text-sm font-bold text-slate-300 mt-3">{isStudent ? 'No payment records found for your account.' : historySearchTerm ? 'No results found for "' + historySearchTerm + '"' : 'Start by recording students payments above.'}</p>
                    </div>
                 )}
            </div>
        </div>
      </div>

      {/* --- RECEIPT VIEW MODAL --- */}
      {viewReceiptFee && receiptStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewReceiptFee(null)}>
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50 p-6 border-b flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <span className="text-2xl">🧾</span>
                         <div>
                             <h3 className="font-black text-slate-800 leading-tight">Digital Statement</h3>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Official Record #{viewReceiptFee.id.slice(-6)}</p>
                         </div>
                     </div>
                     <button onClick={() => setViewReceiptFee(null)} className="w-10 h-10 rounded-full border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all font-bold">✕</button>
                </div>
                <div className="p-8 overflow-y-auto bg-slate-100/50">
                    <div className="bg-white p-8 border border-slate-200 shadow-2xl rounded-[2rem] receipt-paper relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600 rounded-t-full"></div>
                        <div className="text-center mb-8 pb-6 border-b-2 border-dashed border-slate-100">
                            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-slate-100 shadow-lg overflow-hidden p-2">
                                {schoolProfile.logo ? (
                                    <img src={schoolProfile.logo} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-5xl">🏫</span>
                                )}
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{schoolProfile.name}</h2>
                            <p className="text-xs text-slate-500 italic mt-2">"{schoolProfile.motto}"</p>
                            <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 mt-4 uppercase tracking-widest border border-slate-200">Session: {schoolProfile.currentSession}</div>
                        </div>
                        <div className="space-y-6 mb-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment By</p>
                                    <p className="font-black text-slate-800 text-xl tracking-tight">{receiptStudent.name}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1">ID: {receiptStudent.id} • Class {receiptStudent.grade}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
                                    <p className="font-black text-slate-700 text-sm">{new Date().toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'})}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner p-1">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-slate-400 font-black uppercase tracking-widest">
                                        <tr><th className="p-3">Schedule</th><th className="p-3">Allocation</th><th className="p-3 text-right">Amount</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white rounded-xl">
                                        {receiptTransactions.map(t => (
                                            <tr key={t.id} className={t.id === viewReceiptFee.id ? "bg-indigo-50/50" : ""}>
                                                <td className="p-4 text-slate-500 font-bold whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                                                <td className="p-4">
                                                    <div className="font-black text-slate-800">{t.type} {t.id === viewReceiptFee.id && <span className="text-[8px] px-2 py-0.5 bg-indigo-600 text-white rounded-full ml-2 font-black uppercase tracking-tighter">NEW</span>}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{t.paymentMethod}</div>
                                                </td>
                                                <td className="p-4 text-right font-black text-slate-900 text-sm">{currency}{t.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Agreed</p>
                                    <p className="font-black text-indigo-700 text-xs">{currency}{receiptStats.totalFee.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Paid</p>
                                    <p className="font-black text-emerald-700 text-xs">{currency}{receiptStats.paidFees.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
                                    <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Due</p>
                                    <p className="font-black text-rose-700 text-xs">{currency}{receiptStats.dueFees.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Terms and Conditions Section */}
                            {schoolProfile.termsAndConditions && (
                                <div className="mt-6 pt-4 border-t border-slate-100 text-left">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Terms & Conditions</p>
                                    <p className="text-[9px] text-slate-500 leading-relaxed whitespace-pre-wrap italic">
                                        {schoolProfile.termsAndConditions}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="border-t-2 border-dashed border-slate-100 pt-8 mt-4 text-center">
                             {schoolProfile.authorizedSignature && (
                                <div className="mb-6">
                                    <img src={schoolProfile.authorizedSignature} alt="Authorized Signature" className="h-12 mx-auto object-contain" />
                                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mt-2">Institutional Seal & Signature</p>
                                </div>
                             )}
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 p-1 bg-white border border-slate-100 rounded-xl mb-3 shadow-sm">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`ReceiptID:${viewReceiptFee.id}|Student:${receiptStudent.name}|Paid:${viewReceiptFee.amount}`)}`} alt="Verify" className="w-full h-full"/>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scan to verify authenticity</p>
                                <p className="text-[9px] text-slate-300 font-medium mt-4">Generated on {new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 border-t flex gap-4">
                     <button onClick={handleQuickSave} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 group">
                        <span className="text-lg group-hover:-translate-y-1 transition-transform">📥</span> 
                        <span>Download PDF</span>
                     </button>
                     <button onClick={handleQuickShare} disabled={isSharing} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-3 group disabled:opacity-70">
                        <span className="text-lg group-hover:-translate-y-1 transition-transform">{isSharing ? '⏳' : '🔗'}</span> 
                        <span>{isSharing ? 'Sharing...' : 'Share Receipt'}</span>
                     </button>
                </div>
            </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION --- */}
      {feeToDelete && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={() => setFeeToDelete(null)}>
              <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl border border-white/20 animate-scale-in" onClick={e => e.stopPropagation()}>
                  <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-xl shadow-rose-100/50">⚠️</div>
                  <h3 className="text-2xl font-black text-slate-800 mb-3 leading-tight">Remove Record?</h3>
                  <p className="text-sm text-slate-500 mb-10 font-medium leading-relaxed px-4">This transaction will be voided and moved to the Recycle Bin. Continue?</p>
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleDeleteConfirm} 
                        className="w-full py-5 bg-rose-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
                      >
                          Yes, Delete Permanently
                      </button>
                      <button 
                        onClick={() => setFeeToDelete(null)} 
                        className="w-full py-5 bg-slate-50 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
                      >
                          No, Keep Record
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Fees;