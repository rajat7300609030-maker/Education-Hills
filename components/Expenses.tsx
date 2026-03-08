import React, { useState, useMemo } from 'react';
import { ExpenseRecord } from '../types';
import { submitToFormspree } from '../lib/formspree';

interface ExpensesProps {
  expenses: ExpenseRecord[];
  currency: string;
  onAddExpense: (expense: Omit<ExpenseRecord, 'id' | 'isDeleted'>) => void;
  onEditExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, currency, onAddExpense, onEditExpense, onDeleteExpense }) => {
  // --- State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Void Confirmation State
  const [expenseToVoid, setExpenseToVoid] = useState<ExpenseRecord | null>(null);

  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [formData, setFormData] = useState({
    title: '',
    amount: 0,
    category: 'Supplies' as ExpenseRecord['category'],
    paymentMethod: 'Cash' as ExpenseRecord['paymentMethod'],
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const categories = ['Salary', 'Maintenance', 'Utilities', 'Supplies', 'Events', 'Other'];

  // --- Derived Data ---
  const activeExpenses = useMemo(() => (expenses || []).filter(e => !e.isDeleted), [expenses]);

  const filteredHistory = useMemo(() => {
    return activeExpenses.filter(e => {
      if (dateRange.start && e.date < dateRange.start) return false;
      if (dateRange.end && e.date > dateRange.end) return false;
      
      // Search Filter
      if (historySearchTerm) {
        const term = historySearchTerm.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(term);
        const matchesCategory = e.category.toLowerCase().includes(term);
        if (!matchesTitle && !matchesCategory) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeExpenses, dateRange, historySearchTerm]);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalAmount = filteredHistory.reduce((sum, e) => sum + e.amount, 0);
    const transactionCount = filteredHistory.length;
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const todayAmount = filteredHistory
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + e.amount, 0);
    
    return { totalAmount, transactionCount, todayAmount };
  }, [filteredHistory]);

  // --- Helpers ---
  const getCategoryIcon = (category: string) => {
    switch(category) {
        case 'Salary': return '👔';
        case 'Maintenance': return '🛠️';
        case 'Utilities': return '💡';
        case 'Supplies': return '📦';
        case 'Events': return '🎉';
        default: return '🧾';
    }
  };

  const getMethodIcon = (method: string) => {
    switch(method) {
      case 'Cash': return '💵';
      case 'Bank Transfer': return '🏦';
      case 'Card': return '💳';
      case 'Cheque': return '🎫';
      default: return '💰';
    }
  };

  // --- Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await submitToFormspree(editingId ? 'Edit School Expense' : 'New School Expense', {
      ...formData,
      editing_id: editingId || 'N/A'
    });

    if (editingId) {
        onEditExpense({ ...formData, id: editingId, isDeleted: false });
    } else {
        onAddExpense(formData);
    }
    handleClear();
    setIsFormOpen(false);
  };

  const handleClear = () => {
    setFormData({
        title: '',
        amount: 0,
        category: 'Supplies',
        paymentMethod: 'Cash',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    setEditingId(null);
  };

  const handleConfirmVoid = () => {
    if (expenseToVoid) {
        onDeleteExpense(expenseToVoid.id);
        setExpenseToVoid(null);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
        
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                ☁️ Cloud Synced
            </span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 flex items-center gap-3">
              <span>Expenses</span>
              <span>💸</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1 italic opacity-80">Track institutional costs and maintain historical records.</p>
        </div>
      </header>

      {/* --- EXPENSE ENTRY FORM --- */}
      <div className="mb-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative transition-all">
             <div className="absolute top-0 right-0 w-96 h-96 bg-red-50/50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             
             <div 
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="px-8 py-6 relative z-10 flex items-center justify-between cursor-pointer group bg-gradient-to-r from-red-950 via-rose-900 to-pink-950 transition-all select-none border-b border-white/10 hover:shadow-xl"
             >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        📤
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white leading-tight">
                           {editingId ? 'Edit Record' : 'Log New Expense'}
                        </h3>
                        <p className="text-[10px] font-bold text-rose-300 uppercase tracking-[0.2em] opacity-80">Institutional Outflow Log</p>
                    </div>
                </div>
                <div className={`w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-all duration-300 ${isFormOpen ? 'rotate-180 shadow-lg' : ''}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
             </div>

             <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isFormOpen ? 'max-h-[2500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                 <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                      <div className="lg:col-span-4 bg-gradient-to-br from-rose-50/60 via-white to-orange-50/60 p-10 pt-8">
                           <div className="space-y-8">
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xl shadow-sm">👁️</div>
                                   <h3 className="text-xl font-black text-slate-800">Quick Preview</h3>
                               </div>
                               <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100 relative overflow-hidden group space-y-6">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl group-hover:scale-125 transition-transform duration-700 rotate-12">💸</div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Details</p>
                                        <h4 className="font-black text-slate-800 text-2xl leading-tight uppercase tracking-tight">{formData.title || 'Draft Entry...'}</h4>
                                    </div>
                                    <div className="pt-6 mt-2 border-t border-slate-50 relative z-10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Voucher Amount</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-black text-rose-400">{currency}</span>
                                            <span className="text-5xl font-black text-rose-600 tracking-tighter">{formData.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                               </div>
                           </div>
                      </div>

                      <div className="lg:col-span-8 bg-white p-10 pt-8">
                           <div className="space-y-8">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                   <div className="md:col-span-2 bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 focus-within:ring-8 focus-within:ring-rose-500/5 focus-within:border-rose-500 transition-all shadow-inner group">
                                        <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] block mb-2 ml-1">Voucher Amount {currency}</label>
                                        <div className="flex items-center gap-4">
                                            <span className="text-5xl font-black text-slate-300 drop-shadow-sm group-focus-within:text-rose-400 transition-colors">{currency}</span>
                                            <input 
                                                type="number" required min="0" placeholder="0.00"
                                                className="w-full bg-transparent text-7xl font-black text-slate-900 outline-none placeholder:text-slate-100 tracking-tighter"
                                                value={formData.amount || ''}
                                                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                                            />
                                        </div>
                                   </div>
                                   <div className="md:col-span-2 space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Title / Recipient / Purpose</label>
                                       <input 
                                            type="text" required placeholder="e.g. Monthly Staff Salary or Electricity Bill"
                                            className="w-full h-16 p-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm"
                                            value={formData.title}
                                            onChange={e => setFormData({...formData, title: e.target.value})}
                                       />
                                   </div>
                                   <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Category Classification</label>
                                       <select 
                                            className="w-full h-16 p-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm"
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value as any})}
                                       >
                                           {categories.map(c => <option key={c} value={c}>{getCategoryIcon(c)} {c}</option>)}
                                       </select>
                                   </div>
                                   <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Voucher Date</label>
                                       <input 
                                            type="date" required 
                                            className="w-full h-16 p-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm"
                                            value={formData.date}
                                            onChange={e => setFormData({...formData, date: e.target.value})}
                                       />
                                   </div>
                                   <div className="md:col-span-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">Payment Instrument</label>
                                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                           {['Cash', 'Bank Transfer', 'Card', 'Cheque'].map(mode => (
                                               <button
                                                    key={mode} type="button"
                                                    onClick={() => setFormData({...formData, paymentMethod: mode as any})}
                                                    className={`flex flex-col items-center justify-center gap-2 h-20 rounded-[1.5rem] border-2 transition-all group/mode ${
                                                        formData.paymentMethod === mode 
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105 z-20' 
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-600'
                                                    }`}
                                               >
                                                   <span className="text-2xl group-hover/mode:scale-110 transition-transform">{getMethodIcon(mode)}</span>
                                                   <span className="text-[9px] font-black uppercase tracking-widest">{mode}</span>
                                               </button>
                                           ))}
                                       </div>
                                   </div>
                               </div>
                               <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={handleClear} className="px-8 py-5 bg-white text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-50 hover:text-rose-600 border border-slate-100 transition-all active:scale-95">Reset</button>
                                    <button 
                                        type="submit" disabled={!formData.title || formData.amount <= 0} 
                                        className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-rose-100 hover:bg-rose-700 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        New Expenses add
                                    </button>
                               </div>
                           </div>
                      </div>
                 </div>
             </div>
        </form>
      </div>

       {/* --- EXPENSE HISTORY --- */}
       <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 mb-6 animate-fade-in transition-all">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shadow-inner border border-rose-100">
                    📉
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Total Expenses History</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Expenditure Ledger</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 justify-end">
                {/* Search Bar Addition */}
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-600 transition-colors">
                        <span className="text-lg">🔍</span>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search by title or category..." 
                        className="w-full h-12 pl-11 pr-10 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 focus:bg-white transition-all shadow-inner"
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

                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner shrink-0">
                    <input type="date" className="bg-white border-0 rounded-xl text-[10px] font-black text-slate-600 outline-none px-4 py-2.5 shadow-sm" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                    <span className="text-slate-300 font-black text-xs px-1">TO</span>
                    <input type="date" className="bg-white border-0 rounded-xl text-[10px] font-black text-slate-600 outline-none px-4 py-2.5 shadow-sm" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                </div>
            </div>
        </div>

        {/* --- PREMIUM GLOWING EXPENSE SUMMARY BANNER --- */}
        <div className="mb-8 relative group animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 rounded-[2rem] shadow-2xl transition-transform duration-700 group-hover:scale-[1.002]"></div>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] rounded-[2rem]"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-rose-500/10 rounded-[2.1rem] blur-2xl opacity-40 pointer-events-none"></div>
            
            <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Total Expenditure Section */}
                <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-3xl rounded-[1.25rem] flex items-center justify-center text-3xl border border-white/20 shadow-inner text-white shrink-0 animate-pulse">
                        💸
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-rose-300 uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                            Total Outflow
                        </p>
                        <h4 className="text-4xl font-black text-white tracking-tighter flex items-baseline gap-1.5">
                            <span className="text-sm opacity-40 font-bold">{currency}</span>
                            {stats.totalAmount.toLocaleString()}
                        </h4>
                    </div>
                </div>
                
                <div className="h-12 w-px bg-white/10 hidden md:block"></div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-8 w-full md:w-auto">
                    <div className="text-center md:text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Transactions</p>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <p className="text-2xl font-black text-white tracking-tight">{stats.transactionCount}</p>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Records</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Today's Spend</p>
                        <div className="flex items-center justify-end gap-2.5">
                            <p className="text-2xl font-black text-emerald-500 tracking-tight">
                                <span className="text-sm opacity-50 mr-0.5">{currency}</span>
                                {stats.todayAmount.toLocaleString()}
                            </p>
                            <div className="w-8 h-8 bg-emerald-500/10 backdrop-blur-md rounded-lg flex items-center justify-center text-lg border border-emerald-500/20 text-emerald-400 shadow-xl">
                                📈
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
             {filteredHistory.length > 0 ? (
                filteredHistory.map(expense => {
                    const isActive = activeExpenseId === expense.id;
                    return (
                        <div 
                            key={expense.id} 
                            onClick={() => setActiveExpenseId(isActive ? null : expense.id)} 
                            className={`group relative bg-white rounded-[2rem] p-6 border-2 transition-all duration-500 cursor-pointer overflow-hidden ${
                                isActive 
                                ? 'border-rose-500 shadow-2xl scale-[1.05] z-30' 
                                : 'border-slate-50 shadow-lg hover:border-rose-100 hover:shadow-2xl hover:-translate-y-1'
                            }`}
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -translate-y-4 translate-x-4 transition-transform group-hover:scale-110`}></div>
                            
                            <div className="relative z-10 flex flex-col h-full space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-rose-100 shadow-lg flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform duration-300">
                                        {getCategoryIcon(expense.category)}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{expense.category}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">{new Date(expense.date).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <h5 className="font-black text-slate-800 text-base leading-tight uppercase tracking-tight line-clamp-2 min-h-[2.5rem]">
                                    {expense.title}
                                </h5>

                                <div className="bg-slate-50/80 rounded-2xl p-4 border border-white/60 group-hover:bg-white transition-colors duration-500 shadow-inner">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Voucher Amount</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-rose-600 transition-colors">
                                        {currency}{expense.amount.toLocaleString()}
                                    </p>
                                </div>

                                <div className="relative min-h-[40px]">
                                    {isActive ? (
                                        <div className="animate-scale-in flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingId(expense.id); setFormData({...expense, description: expense.description || ''}); setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-200 active:scale-95 transition-all">✏️ Edit</button>
                                            <button onClick={(e) => { e.stopPropagation(); setExpenseToVoid(expense); }} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all">🗑️ Void</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 border-dashed mt-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Validated
                                            </span>
                                            <span className="text-[11px] font-black text-slate-500">{getMethodIcon(expense.paymentMethod)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })
             ) : (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-[4rem] bg-slate-50/30">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl shadow-xl border border-slate-100 mb-6 animate-float">💸</div>
                    <p className="font-black text-2xl text-slate-400 uppercase tracking-[0.2em]">No Expenses Logged</p>
                    <p className="text-sm font-bold text-slate-300 mt-3 italic">{historySearchTerm ? `No results found for "${historySearchTerm}"` : 'Everything is balanced for this session! 🌈'}</p>
                </div>
             )}
        </div>
      </div>

      {/* --- VOID CONFIRMATION MODAL --- */}
      {expenseToVoid && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={() => setExpenseToVoid(null)}>
              <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl border border-white/20 animate-scale-in" onClick={e => e.stopPropagation()}>
                  <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-xl shadow-rose-100/50">⚠️</div>
                  <h3 className="text-2xl font-black text-slate-800 mb-3 leading-tight">Void Expense?</h3>
                  <p className="text-sm text-slate-500 mb-10 font-medium leading-relaxed px-4">
                      Are you sure you want to void <strong>{expenseToVoid.title}</strong>? This record will be moved to the Recycle Bin.
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleConfirmVoid} 
                        className="w-full py-5 bg-rose-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
                      >
                          Yes, Void it
                      </button>
                      <button 
                        onClick={() => setExpenseToVoid(null)} 
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

export default Expenses;