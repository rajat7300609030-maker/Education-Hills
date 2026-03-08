import React, { useState } from 'react';
import { AppData } from '../types';

interface RecycleBinProps {
  data: AppData;
  currency: string;
  onRestoreStudent: (id: string) => void;
  onRestoreEmployee?: (id: string) => void;
  onRestoreFee: (id: string) => void;
  onRestoreExpense: (id: string) => void;
  onHardDeleteStudent: (id: string) => void;
  onHardDeleteEmployee?: (id: string) => void;
  onHardDeleteFee: (id: string) => void;
  onHardDeleteExpense: (id: string) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const RecycleBin: React.FC<RecycleBinProps> = ({ 
  data, 
  currency,
  onRestoreStudent, 
  onRestoreEmployee,
  onRestoreFee, 
  onRestoreExpense,
  onHardDeleteStudent, 
  onHardDeleteEmployee,
  onHardDeleteFee,
  onHardDeleteExpense,
  onNotify
}) => {
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      action: () => void;
      type: 'restore' | 'delete';
  } | null>(null);

  const [collapsedBins, setCollapsedBins] = useState<{ [key: string]: boolean }>({
    students: true,
    employees: true,
    fees: true,
    expenses: true
  });

  const toggleBin = (bin: string) => {
    setCollapsedBins(prev => ({ ...prev, [bin]: !prev[bin] }));
  };

  const deletedStudents = data.students.filter(s => s.isDeleted);
  const deletedEmployees = data.employees ? data.employees.filter(e => e.isDeleted) : [];
  const deletedFees = data.fees.filter(f => f.isDeleted);
  const deletedExpenses = data.expenses ? data.expenses.filter(e => e.isDeleted) : [];

  const handleAction = (title: string, message: string, action: () => void, type: 'restore' | 'delete', successMsg: string) => {
      setConfirmModal({
          isOpen: true,
          title,
          message,
          type,
          action: () => {
              action();
              onNotify?.(`🎉 ${successMsg}`, 'success');
              setConfirmModal(null);
          }
      });
  };

  const getRemainingDays = (deletedAt?: string) => {
    if (!deletedAt) return null;
    const delDate = new Date(deletedAt);
    const now = new Date();
    const expiry = new Date(delDate);
    expiry.setDate(expiry.getDate() + 30);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const ExpiryBadge = ({ deletedAt }: { deletedAt?: string }) => {
    const days = getRemainingDays(deletedAt);
    if (days === null) return null;
    const isUrgent = days <= 5;
    return (
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
            isUrgent ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-400'
        }`}>
            Expires in {days}d
        </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header>
        <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                System Storage 🗑️
            </span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                30-Day Auto Cleanup Active ⏱️
            </span>
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Recycle Bin</h2>
        <p className="text-slate-500 font-medium">Items are automatically purged 30 days after deletion.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
        {/* Students Bin */}
        <div className={`bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 flex flex-col group/bin ${collapsedBins.students ? 'h-[92px]' : 'h-[500px]'}`}>
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-inner border border-blue-100 group-hover/bin:rotate-12 transition-transform">🎓</div>
                 <div>
                    <h3 className="font-black text-slate-800 leading-tight">Students</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{deletedStudents.length} Records</p>
                 </div>
             </div>
             <button 
                onClick={() => toggleBin('students')}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
             >
                {collapsedBins.students ? '👁️' : '➖'}
             </button>
          </div>
          {!collapsedBins.students && (
            <div className="divide-y divide-slate-50 overflow-y-auto flex-1 scrollbar-hide">
              {deletedStudents.length > 0 ? deletedStudents.map(student => (
                <div key={student.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors animate-fade-in">
                  <div className="min-w-0 pr-2">
                     <p className="font-black text-slate-800 truncate">{student.name}</p>
                     <div className="flex items-center gap-2 mt-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ID: {student.id}</p>
                          <ExpiryBadge deletedAt={student.deletedAt} />
                     </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleAction("Restore Student?", `Bring ${student.name} back to active list?`, () => onRestoreStudent(student.id), 'restore', `${student.name} restored!`)} className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Restore">♻️</button>
                    <button onClick={() => handleAction("Permanent Delete?", `Delete ${student.name} forever? This cannot be undone.`, () => onHardDeleteStudent(student.id), 'delete', `${student.name} purged!`)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Purge">🗑️</button>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 p-10 text-center">
                    <span className="text-6xl mb-4">🍃</span>
                    <p className="font-black text-sm uppercase tracking-widest opacity-50">Student bin is empty</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Employees Bin */}
        <div className={`bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 flex flex-col group/bin ${collapsedBins.employees ? 'h-[92px]' : 'h-[500px]'}`}>
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-inner border border-amber-100 group-hover/bin:rotate-12 transition-transform">👔</div>
                 <div>
                    <h3 className="font-black text-slate-800 leading-tight">Employees</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{deletedEmployees.length} Records</p>
                 </div>
             </div>
             <button 
                onClick={() => toggleBin('employees')}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
             >
                {collapsedBins.employees ? '👁️' : '➖'}
             </button>
          </div>
          {!collapsedBins.employees && (
            <div className="divide-y divide-slate-50 overflow-y-auto flex-1 scrollbar-hide">
              {deletedEmployees.length > 0 ? deletedEmployees.map(emp => (
                <div key={emp.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors animate-fade-in">
                  <div className="min-w-0 pr-2">
                     <p className="font-black text-slate-800 truncate">{emp.name}</p>
                     <div className="flex items-center gap-2 mt-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{emp.role}</p>
                          <ExpiryBadge deletedAt={emp.deletedAt} />
                     </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => onRestoreEmployee && handleAction("Restore Employee?", `Bring ${emp.name} back?`, () => onRestoreEmployee(emp.id), 'restore', `${emp.name} restored!`)} className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Restore">♻️</button>
                    <button onClick={() => handleAction("Permanent Delete?", `Delete ${emp.name} forever?`, () => onHardDeleteEmployee?.(emp.id), 'delete', `${emp.name} purged!`)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Purge">🗑️</button>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 p-10 text-center">
                    <span className="text-6xl mb-4">👔</span>
                    <p className="font-black text-sm uppercase tracking-widest opacity-50">Employee bin is empty</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fees Bin */}
        <div className={`bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 flex flex-col group/bin ${collapsedBins.fees ? 'h-[92px]' : 'h-[500px]'}`}>
           <div className="p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
             <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner border border-emerald-100 group-hover/bin:rotate-12 transition-transform">💰</div>
                    <div>
                        <h3 className="font-black text-slate-800 leading-tight">Fees Ledger</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{deletedFees.length} Records</p>
                    </div>
                </div>
                <button 
                  onClick={() => toggleBin('fees')}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                >
                  {collapsedBins.fees ? '👁️' : '➖'}
                </button>
             </div>
          </div>
          {!collapsedBins.fees && (
            <div className="divide-y divide-slate-50 overflow-y-auto flex-1 scrollbar-hide">
              {deletedFees.length > 0 ? deletedFees.map(fee => {
                const student = data.students.find(s => s.id === fee.studentId);
                return (
                  <div key={fee.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors animate-fade-in">
                    <div className="min-w-0 pr-2">
                      <p className="font-black text-slate-800 truncate">{currency}{fee.amount.toLocaleString()} - {fee.type}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                              {student?.name || 'Archived'}
                          </p>
                          <ExpiryBadge deletedAt={fee.deletedAt} />
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                          onClick={() => handleAction("Restore Fee Record?", `Recover this fee payment for ${student?.name}?`, () => onRestoreFee(fee.id), 'restore', "Record restored!")} 
                          className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                      >
                          <span>♻️</span>
                          <span>Restore</span>
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 p-10 text-center">
                    <span className="text-6xl mb-4">💎</span>
                    <p className="font-black text-sm uppercase tracking-widest opacity-50">Financial bin is clear</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expenses Bin */}
        <div className={`bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 flex flex-col group/bin ${collapsedBins.expenses ? 'h-[92px]' : 'h-[500px]'}`}>
           <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shadow-inner border border-rose-100 group-hover/bin:rotate-12 transition-transform">💸</div>
                 <div>
                    <h3 className="font-black text-slate-800 leading-tight">Expenses</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{deletedExpenses.length} Records</p>
                 </div>
             </div>
             <button 
                onClick={() => toggleBin('expenses')}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
             >
                {collapsedBins.expenses ? '👁️' : '➖'}
             </button>
          </div>
          {!collapsedBins.expenses && (
            <div className="divide-y divide-slate-50 overflow-y-auto flex-1 scrollbar-hide">
              {deletedExpenses.length > 0 ? deletedExpenses.map(expense => (
                  <div key={expense.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors animate-fade-in">
                    <div className="min-w-0 pr-2">
                      <p className="font-black text-slate-800 truncate">{currency}{expense.amount.toLocaleString()} - {expense.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{expense.category}</p>
                          <ExpiryBadge deletedAt={expense.deletedAt} />
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleAction("Restore Expense?", `Bring back expense record: "${expense.title}"?`, () => onRestoreExpense(expense.id), 'restore', "Expense record restored!")} className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Restore">♻️</button>
                      <button onClick={() => handleAction("Permanent Delete?", `Purge expense record: "${expense.title}"? This will affect historical statistics.`, () => onHardDeleteExpense(expense.id), 'delete', "Expense purged!")} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Purge">🗑️</button>
                    </div>
                  </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 p-10 text-center">
                    <span className="text-6xl mb-4">📉</span>
                    <p className="font-black text-sm uppercase tracking-widest opacity-50">Expense bin is empty</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Premium Confirmation Modal */}
      {confirmModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setConfirmModal(null)}>
              <div className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-sm text-center animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-2xl transition-all ${
                    confirmModal.type === 'restore' 
                    ? 'bg-emerald-50 text-emerald-500 shadow-emerald-200' 
                    : 'bg-rose-50 text-rose-500 shadow-rose-200'
                  }`}>
                    {confirmModal.type === 'restore' ? '♻️' : '⚠️'}
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">{confirmModal.title}</h3>
                  <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed px-2">
                    {confirmModal.message}
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={confirmModal.action} 
                        className={`w-full py-5 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl transition-all active:scale-95 ${
                            confirmModal.type === 'restore' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                        }`}
                      >
                          Yes, Proceed
                      </button>
                      <button 
                        onClick={() => setConfirmModal(null)} 
                        className="w-full py-5 bg-slate-50 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
                      >
                          No, Go Back
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RecycleBin;