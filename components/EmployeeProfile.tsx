import React, { useState, useMemo } from 'react';
import { Employee, ExpenseRecord, SchoolProfileData } from '../types';

interface EmployeeProfileProps {
  employee: Employee;
  expenses: ExpenseRecord[];
  schoolData: SchoolProfileData;
  currency: string;
  onBack: () => void;
  onNavigateToEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onEditExpense?: (expense: ExpenseRecord) => void;
  onDeleteExpense?: (id: string) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ 
    employee, 
    expenses, 
    schoolData,
    currency,
    onBack, 
    onNavigateToEdit,
    onDelete,
    onEditExpense,
    onDeleteExpense,
    onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Payments' | 'ID'>('Overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState<string | null>(null);

  // Filter salary payments for this employee
  const salaryHistory = useMemo(() => {
    return expenses.filter(e => 
      !e.isDeleted && 
      e.category === 'Salary' && 
      (e.title.toLowerCase().includes(employee.name.toLowerCase()) || e.title.includes(employee.id))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, employee.name, employee.id]);

  const totalPaid = useMemo(() => salaryHistory.reduce((sum, e) => sum + e.amount, 0), [salaryHistory]);

  const tenureMonths = useMemo(() => {
    if (!employee.joiningDate) return 0;
    const start = new Date(employee.joiningDate);
    const end = new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return Math.max(0, months);
  }, [employee.joiningDate]);

  const totalAccruedSalary = tenureMonths * employee.salary;

  const paidPercentage = useMemo(() => {
    if (totalAccruedSalary === 0) return 0;
    return Math.min(100, Math.round((totalPaid / totalAccruedSalary) * 100));
  }, [totalPaid, totalAccruedSalary]);

  const formatDate = (dateStr: string | undefined | null) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

  const DetailRow = ({ icon, label, value, isLink = false }: { icon: string, label: string, value?: string, isLink?: boolean }) => (
      <div className="flex items-start gap-3 text-sm">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg border shrink-0 mt-0.5 bg-slate-50 border-slate-100">{icon}</span>
          <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              {isLink && value ? (
                 <a href={`tel:${value}`} className="font-bold text-indigo-600 hover:underline truncate block">{value}</a>
              ) : (
                 <p className="font-bold truncate text-slate-700">{value || 'N/A'}</p>
              )}
          </div>
      </div>
  );

  return (
    <div className="animate-fade-in pb-12 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
        >
            <span>⬅️</span> Back
        </button>
        <div className="flex gap-2">
            <button 
                onClick={() => onNavigateToEdit(employee)}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
            >
                ✏️ Edit
            </button>
            <button 
                onClick={() => { if(confirm(`Delete ${employee.name}?`)) onDelete(employee.id); }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
            >
                🗑️ Delete
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: BASIC PROFILE */}
          <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
                  <div className="h-28 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 relative">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBvcGFjaXR5PSIwLjEiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] opacity-30"></div>
                  </div>
                  
                  <div className="px-6 pb-6 relative">
                      <div className="flex justify-center -mt-14 mb-4">
                          <div className="w-28 h-28 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden flex items-center justify-center text-5xl relative z-10">
                              {employee.photo ? (
                                  <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                              ) : (
                                  <span>{employee.name.charAt(0)}</span>
                              )}
                          </div>
                      </div>
                      
                      <div className="text-center mb-8 border-b border-slate-50 pb-6">
                          <h2 className="text-2xl font-black text-slate-800 leading-tight">{employee.name}</h2>
                          <div className="flex justify-center flex-wrap gap-2 mt-3">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                                  ID: {employee.id}
                              </span>
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100">
                                  {employee.role}
                              </span>
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                  {employee.status}
                              </span>
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div>
                              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest mb-3">Contact Details</h4>
                              <div className="space-y-4">
                                  <DetailRow icon="📞" label="Phone" value={employee.phone} isLink />
                                  <DetailRow icon="📧" label="Email" value={employee.email} />
                                  <DetailRow icon="🎂" label="Date of Birth" value={formatDate(employee.dob)} />
                                  <DetailRow icon="📅" label="Joining Date" value={formatDate(employee.joiningDate)} />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                   <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-6">Financial Overview</h3>
                   
                   {/* Circular Chart & Percentage */}
                   <div className="flex flex-col items-center mb-8">
                       <div className="relative w-32 h-32 flex items-center justify-center">
                           <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                               {/* Background Circle */}
                               <circle 
                                   cx="50" cy="50" r="45" 
                                   fill="transparent" 
                                   stroke="currentColor" 
                                   strokeWidth="8" 
                                   className="text-slate-100"
                               />
                               {/* Progress Circle */}
                               <circle 
                                   cx="50" cy="50" r="45" 
                                   fill="transparent" 
                                   stroke="currentColor" 
                                   strokeWidth="8" 
                                   strokeDasharray={2 * Math.PI * 45}
                                   strokeDashoffset={2 * Math.PI * 45 * (1 - paidPercentage / 100)}
                                   strokeLinecap="round"
                                   className="text-indigo-600 transition-all duration-1000 ease-out"
                               />
                           </svg>
                           <div className="absolute flex flex-col items-center">
                               <span className="text-2xl font-black text-slate-800">{paidPercentage}%</span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Paid</span>
                           </div>
                       </div>
                   </div>

                   <div className="space-y-4">
                       <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Salary</span>
                           <span className="font-black text-slate-800">{currency}{employee.salary.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total Accrued ({tenureMonths} Months)</span>
                           <span className="font-black text-indigo-700">{currency}{totalAccruedSalary.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Paid (All Time)</span>
                           <span className="font-black text-emerald-700">{currency}{totalPaid.toLocaleString()}</span>
                       </div>

                       {/* Linear Progress Bar */}
                       <div className="pt-2">
                           <div className="flex justify-between items-center mb-1.5">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Completion</span>
                               <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{paidPercentage}%</span>
                           </div>
                           <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                   className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                                   style={{ width: `${paidPercentage}%` }}
                               ></div>
                           </div>
                       </div>
                   </div>
              </div>
          </div>

          {/* RIGHT COLUMN: TABS */}
          <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
                  <div className="bg-slate-50 p-2 flex border-b border-slate-200">
                      {(['Overview', 'Payments', 'ID'] as const).map(tab => (
                          <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                              {tab === 'Overview' && '📊'}
                              {tab === 'Payments' && '💸'}
                              {tab === 'ID' && '🪪'}
                              {tab}
                          </button>
                      ))}
                  </div>

                  <div className="p-8">
                      {activeTab === 'Overview' && (
                          <div className="animate-fade-in space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                                      <h4 className="text-indigo-600 font-black uppercase text-[10px] tracking-widest mb-4">Employment Summary</h4>
                                      <p className="text-slate-600 text-sm leading-relaxed">
                                          {employee.name} is currently serving as <strong>{employee.role}</strong>. 
                                          Joined on <strong>{formatDate(employee.joiningDate)}</strong>. 
                                          Status is <strong>{employee.status}</strong>.
                                      </p>
                                  </div>
                                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                      <h4 className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mb-4">Payment Status</h4>
                                      <p className="text-slate-600 text-sm leading-relaxed">
                                          Total of <strong>{salaryHistory.length}</strong> salary payments recorded. 
                                          Last payment was on <strong>{salaryHistory.length > 0 ? formatDate(salaryHistory[0].date) : 'N/A'}</strong>.
                                      </p>
                                  </div>
                              </div>

                              <div>
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recent Salary Records</h4>
                                  <div className="space-y-3">
                                      {salaryHistory.slice(0, 5).map(payment => (
                                          <div key={payment.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">💵</div>
                                                  <div>
                                                      <p className="font-black text-slate-800 text-sm">{payment.title}</p>
                                                      <p className="text-[10px] font-bold text-slate-400">{formatDate(payment.date)} • {payment.paymentMethod}</p>
                                                  </div>
                                              </div>
                                              <p className="font-black text-slate-800">{currency}{payment.amount.toLocaleString()}</p>
                                          </div>
                                      ))}
                                      {salaryHistory.length === 0 && (
                                          <p className="text-center py-8 text-slate-400 font-bold italic">No salary records found for this employee.</p>
                                      )}
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeTab === 'Payments' && (
                          <div className="animate-fade-in space-y-6">
                              <div className="flex items-center justify-between mb-4">
                                  <div>
                                      <h3 className="text-xl font-black text-slate-800">Salary Payment History</h3>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete record of all salary disbursements</p>
                                  </div>
                                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">{salaryHistory.length} Records</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {salaryHistory.map(payment => {
                                      const isActive = activeExpenseId === payment.id;
                                      return (
                                          <div 
                                            key={payment.id} 
                                            onClick={() => setActiveExpenseId(isActive ? null : payment.id)}
                                            className={`group relative bg-white border-2 transition-all duration-500 cursor-pointer overflow-hidden rounded-[2rem] p-6 ${
                                                isActive 
                                                ? 'border-emerald-500 shadow-2xl scale-[1.02] z-30' 
                                                : 'border-slate-50 shadow-sm hover:border-emerald-100 hover:shadow-md'
                                            }`}
                                          >
                                              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full -translate-y-4 translate-x-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                                              
                                              <div className="relative z-10 flex flex-col h-full space-y-4">
                                                  <div className="flex justify-between items-start">
                                                      <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 shadow-lg flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform duration-300">
                                                          👔
                                                      </div>
                                                      <div className="text-right">
                                                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Salary Paid</p>
                                                          <p className="text-[9px] font-bold text-slate-400 mt-1">{formatDate(payment.date)}</p>
                                                      </div>
                                                  </div>

                                                  <h5 className="font-black text-slate-800 text-sm leading-tight uppercase tracking-tight line-clamp-2">
                                                      {payment.title}
                                                  </h5>

                                                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-white/60 group-hover:bg-white transition-colors duration-500 shadow-inner">
                                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Amount Paid</p>
                                                      <p className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors">
                                                          {currency}{payment.amount.toLocaleString()}
                                                      </p>
                                                  </div>

                                                  {isActive && payment.description && (
                                                      <div className="animate-fade-in p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Details</p>
                                                          <p className="text-xs text-slate-600 font-medium">{payment.description}</p>
                                                      </div>
                                                  )}

                                                  <div className="relative min-h-[40px]">
                                                      {isActive ? (
                                                          <div className="animate-scale-in flex gap-2">
                                                              <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    onNotify?.("Please use the main Expenses page to edit salary records for full control.", "info");
                                                                }} 
                                                                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-amber-200 active:scale-95 transition-all"
                                                              >
                                                                  ✏️ Edit
                                                              </button>
                                                              <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    if(confirm(`Void this payment record?`)) onDeleteExpense?.(payment.id);
                                                                }} 
                                                                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all"
                                                              >
                                                                  🗑️ Void
                                                              </button>
                                                          </div>
                                                      ) : (
                                                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 border-dashed mt-2">
                                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified
                                                              </span>
                                                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{payment.paymentMethod}</span>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}
                                  {salaryHistory.length === 0 && (
                                      <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-sm opacity-50">💸</div>
                                          <p className="text-slate-400 font-black uppercase tracking-widest">No Payment Records Found</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {activeTab === 'ID' && (
                          <div className="animate-fade-in flex flex-col items-center">
                              <div id="employee-id-card-render" className="w-[300px] h-[520px] bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col border border-slate-100">
                                  <div className="h-28 bg-gradient-to-br from-slate-900 to-indigo-900 p-4 flex items-center gap-3 relative">
                                      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48ZyBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDgiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGNpcmNsZSBjeD0iMyIgY3k9IjMiIHI9IjEiLz48Y2lyY2xlIGN4PSIxMyIgY3k9IjEzIiByPSIxIi8+PC9nPjwvc3ZnPg==')]"></div>
                                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shrink-0 z-10 border-2 border-white/20">
                                          {schoolData.logo ? <img src={schoolData.logo} className="w-full h-full object-contain p-1" /> : '🏫'}
                                      </div>
                                      <div className="z-10 min-w-0 text-left">
                                          <h2 className="text-white font-black text-[15px] uppercase leading-tight truncate">{schoolData.name}</h2>
                                          <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mt-0.5">Staff Identity Card</p>
                                      </div>
                                  </div>

                                  <div className="flex-1 flex flex-col items-center pt-8 px-6 pb-4 relative overflow-hidden">
                                      <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg mt-6 z-20 border-2 border-indigo-600">
                                          <div className="w-full h-full rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                                              {employee.photo ? <img src={employee.photo} className="w-full h-full object-cover" /> : <span className="text-4xl text-slate-300">{employee.name.charAt(0)}</span>}
                                          </div>
                                      </div>

                                      <h3 className="text-xl font-black text-slate-800 mt-2 text-center leading-tight relative z-10 uppercase tracking-tight">{employee.name}</h3>
                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase rounded-full mt-1 border border-indigo-100 tracking-widest relative z-10">{employee.role}</span>

                                      <div className="w-full mt-6 space-y-1 flex-1 relative z-10 text-left">
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employee ID</span>
                                              <span className="text-[11px] font-black text-slate-700 font-mono">{employee.id}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DOB</span>
                                              <span className="text-[11px] font-black text-slate-700">{formatDate(employee.dob)}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Joined</span>
                                              <span className="text-[11px] font-black text-slate-700">{formatDate(employee.joiningDate)}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</span>
                                              <span className="text-[11px] font-black text-slate-700">{employee.phone}</span>
                                          </div>
                                          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                                              <span className="text-[11px] font-black text-slate-700 truncate max-w-[140px]">{employee.email || 'N/A'}</span>
                                          </div>
                                      </div>

                                      <div className="flex justify-between items-end w-full mt-4 relative z-10">
                                          <div className="text-left">
                                              <div className="h-6 w-16 border-b-2 border-slate-300 mb-1"></div>
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
                                          </div>
                                          <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=EMP_ID:${employee.id}`} className="w-12 h-12" alt="QR" />
                                          </div>
                                      </div>
                                  </div>

                                  <div className="mt-auto w-full text-center bg-slate-50/50 border-t border-slate-100 pb-3 relative z-10">
                                     <div className="pt-3 mb-1.5">
                                        <p className="text-[11px] text-slate-500 font-black leading-tight mb-1 px-3 line-clamp-1 uppercase tracking-tight">{schoolData.address}</p>
                                     </div>
                                     <p className="text-[10px] text-center font-black tracking-[0.3em] uppercase text-slate-300">Staff ID Card</p>
                                  </div>
                              </div>

                              <div className="mt-8 flex gap-4">
                                  <button 
                                    onClick={() => handleDownloadImage('employee-id-card-render', `Staff_ID_${employee.name}`)}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                  >
                                      Download Card
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
