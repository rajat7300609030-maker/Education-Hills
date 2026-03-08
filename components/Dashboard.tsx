import React, { useState, useEffect, useMemo } from 'react';
import { AppData, AppSettings, FeeRecord, ExpenseRecord, Student, ViewState, SliderImage } from '../types';

interface DashboardProps {
  data: AppData;
  currency: string;
  onUpdateSettings: (settings: AppSettings) => void;
  onNavigateToFees: () => void;
  onNavigateToExpenses: () => void;
  onViewStudentProfile?: (id: string) => void;
  onNavigateToSettings?: () => void;
  onDeleteFee?: (id: string) => void;
  onDeleteExpense?: (id: string) => void;
  userRole?: 'ADMIN' | 'STUDENT';
  currentStudentId?: string;
}

// Reusable component for "0 to X" counting animation with smooth easing
const AnimatedNumber = ({ value, currency, duration = 2000 }: { value: number; currency: string; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeProgress * value));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{currency}{displayValue.toLocaleString()}</>;
};

const FinancialCard = ({ title, rawValue, currency, icon, gradient, delay, subValue }: any) => (
  <div className={`relative overflow-hidden rounded-[2rem] p-6 shadow-xl border border-white/20 text-white animate-slide-up ${gradient}`} style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}>
      <div className="absolute -right-4 -top-4 text-8xl opacity-10 pointer-events-none select-none">{icon}</div>
      <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="animate-float" style={{ animationDelay: `${delay}ms` }}>{icon}</span>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
          </div>
          <h3 className="text-3xl font-black tracking-tight mb-1">
            <AnimatedNumber value={rawValue} currency={currency} />
          </h3>
          {subValue && <p className="text-[10px] font-bold opacity-70 italic">{subValue}</p>}
      </div>
  </div>
);

const ImageSlider = ({ config }: { config: AppSettings['imageSlider'] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = config.images || [];

  useEffect(() => {
    if (!config.enabled || !config.autoplay || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, config.interval || 5000);
    return () => clearInterval(timer);
  }, [config.enabled, config.autoplay, config.interval, images.length]);

  if (!config.enabled || images.length === 0) return null;

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="relative w-full h-[300px] md:h-[450px] rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 group animate-scale-in">
      <div className="absolute inset-0 flex transition-transform duration-1000 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {images.map((img, idx) => (
          <div key={img.id} className="relative min-w-full h-full">
            <img src={img.url} className="w-full h-full object-cover" alt={img.title || 'Slide'} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-10 left-10 right-10 text-white max-w-2xl animate-slide-up">
              <h3 className="text-3xl md:text-5xl font-black tracking-tighter mb-2">{img.title}</h3>
              <p className="text-sm md:text-lg font-medium opacity-80 line-clamp-2">{img.description}</p>
            </div>
          </div>
        ))}
      </div>

      {config.showArrows !== false && images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20">◀</button>
          <button onClick={next} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20">▶</button>
        </>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-6 right-10 flex gap-2">
          {images.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-3 h-3 rounded-full transition-all ${currentIndex === idx ? 'bg-indigo-500 w-8' : 'bg-white/30 hover:bg-white/50'}`}></button>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  data, 
  currency, 
  onNavigateToFees, 
  onNavigateToExpenses, 
  onViewStudentProfile,
  onNavigateToSettings,
  onDeleteFee,
  onDeleteExpense,
  userRole = 'ADMIN', 
  currentStudentId
}) => {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [showAllDefaulters, setShowAllDefaulters] = useState(false);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  
  const currentSession = data.schoolProfile.currentSession;
  const isAdmin = userRole === 'ADMIN';

  const activeStudents = useMemo(() => 
    data.students.filter((s) => !s.isDeleted && (!s.session || s.session === currentSession)), 
  [data.students, currentSession]);

  const activeFees = useMemo(() => data.fees.filter((f) => !f.isDeleted && f.session === currentSession), [data.fees, currentSession]);
  const activeExpenses = useMemo(() => data.expenses ? data.expenses.filter(e => !e.isDeleted && e.session === currentSession) : [], [data.expenses, currentSession]);

  // Global Financials
  const totalRevenue = isAdmin ? activeFees.filter((f) => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0) : 0;
  const totalExpected = isAdmin ? activeStudents.reduce((sum, s) => sum + (s.totalAgreedFees || 0) + (s.backLogs || 0), 0) : 0;
  const totalDue = Math.max(0, totalExpected - totalRevenue);
  const totalExpenses = isAdmin ? activeExpenses.reduce((sum, e) => sum + e.amount, 0) : 0;
  const netProfit = totalRevenue - totalExpenses;

  // Session Progress
  const sessionProgress = totalExpected > 0 ? Math.round((totalRevenue / totalExpected) * 100) : 0;

  // Recent Data Memos
  const recentPayments = useMemo(() => 
    activeFees
      .filter(f => f.status === 'Paid')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5), 
  [activeFees]);

  const recentExpenses = useMemo(() => 
    activeExpenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5), 
  [activeExpenses]);

  // Premium Distribution Colors
  const distributionColors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#f472b6', 
    '#06b6d4', '#8b5cf6', '#ec4899', '#fb923c', '#2dd4bf', 
    '#a855f7', '#64748b'
  ];

  // Student Distribution calculation with percentage and color assignment
  const studentDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeStudents.forEach(s => {
      counts[s.grade] = (counts[s.grade] || 0) + 1;
    });
    const total = activeStudents.length;
    return Object.entries(counts)
      // Sort classes in natural ascending order (e.g., Nursery -> LKG -> 1st -> 2nd)
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
      .map(([grade, count], index) => ({
        grade,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: distributionColors[index % distributionColors.length]
      }));
  }, [activeStudents]);

  // SVG Doughnut Logic
  const chartSegments = useMemo(() => {
    let currentOffset = 0;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    
    return studentDistribution.map(item => {
      const dash = (item.percentage / 100) * circumference;
      const offset = currentOffset;
      currentOffset -= dash;
      return { ...item, dash, offset, circumference };
    });
  }, [studentDistribution]);

  const topDefaulters = useMemo(() => {
    if (!isAdmin) return [];
    return activeStudents.map(student => {
        const studentFees = activeFees.filter(f => f.studentId === student.id);
        const paid = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
        const totalLiability = (student.totalAgreedFees || 0) + (student.backLogs || 0);
        const due = totalLiability - paid;
        return { ...student, due };
    })
    .filter(s => s.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 20);
  }, [activeStudents, activeFees, isAdmin]);

  const displayedDefaulters = showAllDefaulters ? topDefaulters : topDefaulters.slice(0, 5);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCollectionTotal = useMemo(() => activeFees.filter(f => f.status === 'Paid' && f.date === todayStr).reduce((sum, f) => sum + f.amount, 0), [activeFees, todayStr]);
  const todayExpenseTotal = useMemo(() => activeExpenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0), [activeExpenses, todayStr]);

  const auditCollections = useMemo(() => activeFees.filter(f => f.status === 'Paid' && f.date === auditDate), [activeFees, auditDate]);
  const auditExpenses = useMemo(() => activeExpenses.filter(e => e.date === auditDate), [activeExpenses, auditDate]);
  const auditAdmissions = useMemo(() => activeStudents.filter(s => s.enrollmentDate === auditDate), [activeStudents, auditDate]);
  const auditInflow = auditCollections.reduce((sum, f) => sum + f.amount, 0);
  const auditOutflow = auditExpenses.reduce((sum, e) => sum + e.amount, 0);
  const auditNet = auditInflow - auditOutflow;

  const [calendarDate, setCalendarDate] = useState(new Date());
  const changeMonth = (offset: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCalendarDate(newDate);
  };
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calendarDate]);

  const handleDateClick = (day: number | null) => {
    if (!day || !isAdmin) return;
    const dStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setAuditDate(dStr);
    setIsAuditModalOpen(true);
  };

  const handleSendReminder = (student: any) => {
    if (!student.phone) return;
    const message = `🔔 *FEE REMINDER* 🔔\n\nDear Parent,\nThis is a reminder regarding the pending fees for *${student.name}* (Class: ${student.grade}).\n\n💰 *Due Amount:* ${currency}${student.due.toLocaleString()}\n📅 *Session:* ${student.session || data.schoolProfile.currentSession}\n\nPlease clear the outstanding balance soon.\n\nRegards,\n*${data.schoolProfile.name}*`;
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
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

  const getExpenseIcon = (cat: string) => cat === 'Salary' ? '👔' : cat === 'Maintenance' ? '🛠️' : cat === 'Utilities' ? '💡' : cat === 'Supplies' ? '📦' : '🧾';

  return (
    <div className="space-y-8 pb-12 animate-fade-in overflow-x-hidden">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Overview <span className="text-indigo-600">Dashboard</span> 📊</h2>
          <p className="text-slate-500 font-medium">Hello, {data.userProfile.name}. Have a productive day!</p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Cloud Synced</span>
        </div>
      </header>

      {/* --- 1ST POSITION: SCHOOL PROFILE CARD --- */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden relative group transition-all duration-500 animate-scale-in">
          <div className="h-48 relative overflow-hidden group">
              {data.schoolProfile.banner ? (
                  <img src={data.schoolProfile.banner} alt="Banner" className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" />
              ) : (
                  <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 relative">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:30px_30px]"></div>
                  </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              <div className="absolute top-6 right-8 z-20">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-2 rounded-2xl flex flex-col items-end">
                      <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Active Session</span>
                      <span className="text-sm font-black text-white">{data.schoolProfile.currentSession}</span>
                  </div>
              </div>
          </div>
          <div className="px-8 pb-8 text-center relative">
              <div className="w-28 h-28 mx-auto -mt-14 bg-white rounded-[2rem] p-1.5 shadow-2xl mb-4 relative rotate-3 hover:rotate-0 transition-transform duration-300 z-10 border-4 border-white">
                  <div className="w-full h-full rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                       <div className="w-full h-full flex items-center justify-center" style={{ transform: `scale(${(data.schoolProfile.logoSize || 100) / 100})` }}>
                        {data.schoolProfile.logo ? <img src={data.schoolProfile.logo} alt="Logo" className="w-full h-full object-contain p-2" /> : <span className="text-5xl">🏫</span>}
                      </div>
                  </div>
              </div>
              <div className="animate-slide-up space-y-1">
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{data.schoolProfile.name}</h2>
                  <p className="text-sm font-bold text-indigo-600/80 italic">"{data.schoolProfile.motto}"</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 mt-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 backdrop-blur-sm text-left font-black text-slate-800">
                        <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Address</p><p className="text-xs truncate">{data.schoolProfile.address}</p></div>
                        <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact</p><p className="text-xs">{data.schoolProfile.contactNumber}</p></div>
                        <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Board</p><p className="text-xs">{data.schoolProfile.board}</p></div>
                        <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Students</p><p className="text-xs">{activeStudents.length} Enrolled</p></div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- 2ND POSITION: IMAGE SLIDER --- */}
      <ImageSlider config={data.settings.imageSlider} />

      {isAdmin && (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinancialCard title="Total Collection" rawValue={totalRevenue} currency={currency} icon="💰" gradient="bg-gradient-to-br from-emerald-600 to-emerald-800" delay={0} subValue="Gross session inflow" />
                <FinancialCard title="Total Outstanding" rawValue={totalDue} currency={currency} icon="⏳" gradient="bg-gradient-to-br from-rose-600 to-rose-800" delay={100} subValue="Estimated net dues" />
                <FinancialCard title="Total Expenses" rawValue={totalExpenses} currency={currency} icon="💸" gradient="bg-gradient-to-br from-orange-500 to-orange-700" delay={200} subValue="Session maintenance costs" />
                <FinancialCard title="Net Balance" rawValue={netProfit} currency={currency} icon="📈" gradient="bg-gradient-to-br from-indigo-600 to-blue-800" delay={300} subValue="Current profit index" />
            </div>

            {/* --- SESSION STATUS & STUDENT DISTRIBUTION & OUTFLOW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- COLUMN 1: SESSION STATUS & PERFORMANCE LOG --- */}
                <div className="space-y-8">
                    {/* Session Status Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100">📈</span>
                                    <span>Session Status</span>
                                </h3>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">{currentSession}</span>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end mb-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Collection Progress</p>
                                    <p className="text-3xl font-black text-indigo-600">{sessionProgress}%</p>
                                </div>
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-1000 shadow-lg" style={{ width: `${sessionProgress}%` }}></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Expected Revenue</p>
                                        <p className="text-lg font-black text-slate-800 text-center">{currency}{totalExpected.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">Total Realized</p>
                                        <p className="text-lg font-black text-emerald-700 text-center">{currency}{totalRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Log Quick Link - MOVED TO JUST BELOW SESSION STATUS */}
                    <div onClick={() => { setAuditDate(todayStr); setIsAuditModalOpen(true); }} className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 flex flex-col items-center justify-between gap-6 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl pointer-events-none opacity-50"></div>
                        <div className="flex items-center gap-4 w-full relative z-10">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-indigo-100 group-hover:rotate-12 transition-transform shrink-0">📅</div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate">Performance Log ➜</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] truncate">Daily Audit Core</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full relative z-10">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center group-hover:bg-emerald-100 transition-all">
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Today's Inflow</p>
                                <p className="text-2xl font-black text-emerald-700">{currency}{todayCollectionTotal.toLocaleString()}</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col items-center justify-center group-hover:bg-rose-100 transition-all">
                                <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Today's Outflow</p>
                                <p className="text-2xl font-black text-rose-700">{currency}{todayExpenseTotal.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- COLUMN 2: STUDENT DISTRIBUTION --- */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full blur-3xl pointer-events-none opacity-50"></div>
                    
                    <div className="relative z-10 flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm border border-indigo-100">
                                📊
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">
                                Student<br/>Distribution
                            </h3>
                        </div>
                        <div className="bg-slate-100/80 px-4 py-2 rounded-full border border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">AVAILABLE</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">CLASSES</span>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="relative flex justify-center items-center mb-10">
                        <div className="absolute inset-0 bg-indigo-50/20 rounded-full blur-2xl animate-pulse-subtle"></div>
                        <svg className="w-48 h-48 drop-shadow-2xl" viewBox="0 0 160 160">
                            {chartSegments.map((segment, idx) => (
                                <circle
                                    key={idx}
                                    cx="80" cy="80" r="70"
                                    fill="transparent"
                                    stroke={segment.color}
                                    strokeWidth="18"
                                    strokeDasharray={`${segment.dash - 2} ${segment.circumference - (segment.dash - 2)}`}
                                    strokeDashoffset={segment.offset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            ))}
                            {/* Inner hole */}
                            <circle cx="80" cy="80" r="55" fill="white" />
                        </svg>
                        
                        {/* Center Text */}
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ENROLLED</p>
                            <p className="text-4xl font-black text-slate-800 tracking-tighter">{activeStudents.length}</p>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">STUDENTS</p>
                        </div>
                    </div>

                    {/* Grid List */}
                    <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-hide">
                        {studentDistribution.map((item) => (
                            <div key={item.grade} className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-center gap-1 hover:bg-white hover:shadow-md transition-all">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{item.grade}</span>
                                </div>
                                <div className="flex items-baseline gap-1 ml-4">
                                    <span className="text-sm font-black text-slate-800">{item.count}</span>
                                    <span className="text-[10px] font-bold text-slate-400">({item.percentage}%)</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {studentDistribution.length === 0 && (
                        <div className="py-12 text-center text-slate-300 italic text-xs uppercase font-bold tracking-widest">No active enrollments.</div>
                    )}
                </div>

                {/* --- COLUMN 3: OUTFLOW ANALYSIS --- */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl shadow-sm border border-rose-100">📉</span>
                                <span>Outflow Analysis</span>
                            </h3>
                            <button onClick={onNavigateToExpenses} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All ➜</button>
                        </div>
                        <div className="space-y-4">
                            {recentExpenses.length > 0 ? recentExpenses.map((exp) => (
                                <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group/item">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-lg bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-slate-50">{getExpenseIcon(exp.category)}</span>
                                        <div className="min-w-0">
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight block truncate pr-2">{exp.title}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(exp.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-rose-600 whitespace-nowrap pl-2">{currency}{exp.amount.toLocaleString()}</span>
                                </div>
                            )) : (
                                <div className="py-12 text-center text-slate-300 italic text-xs uppercase font-bold tracking-widest">No expenses recorded.</div>
                            )}
                        </div>
                        {recentExpenses.length > 0 && (
                            <div className="mt-8 flex flex-col gap-4">
                                <button 
                                    onClick={onNavigateToExpenses}
                                    className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] border border-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95 shadow-sm"
                                >
                                    🔽 View More Expenses
                                </button>
                                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Expenditure</p>
                                    <p className="text-lg font-black text-rose-600">{currency}{totalExpenses.toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- RECENT PAYMENTS (FEE COLLECTIONS) --- */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl text-xl shadow-sm border border-emerald-50">💸</span>
                        <span>Recent Collections (Top 5)</span>
                    </h3>
                    <button onClick={onNavigateToFees} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All Ledger ➜</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {recentPayments.map(f => {
                                const s = data.students.find(std => std.id === f.studentId);
                                return (
                                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                                {s?.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="flex h-full w-full items-center justify-center font-black text-slate-400 uppercase">{s?.name?.charAt(0) || 'A'}</span>}
                                            </div>
                                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{s?.name || 'Archived Student'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-100 uppercase tracking-tighter">
                                                {getFeeIcon(f.type)} {f.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                                            {new Date(f.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-emerald-600">{currency}{f.amount.toLocaleString()}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {recentPayments.length === 0 && (
                                <tr><td colSpan={4} className="py-8 text-center text-slate-300 italic text-xs uppercase font-bold tracking-widest">No recent transactions.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DEFAULTERS REGISTRY */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-rose-100 text-rose-600 rounded-xl text-xl shadow-sm border border-rose-50">⏳</span>
                        <span>{showAllDefaulters ? 'Top 20 Due Fees Registry' : 'Top Due Fees (Top 5)'}</span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Class</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Dues</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {displayedDefaulters.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                            {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="flex h-full w-full items-center justify-center font-black text-slate-400 uppercase">{s.name.charAt(0)}</span>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{s.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{s.id}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">Class {s.grade}</span></td>
                                    <td className="px-6 py-4"><span className="text-sm font-black text-rose-600">{currency}{s.due.toLocaleString()}</span></td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <a href={`tel:${s.phone}`} className="w-9 h-9 bg-white border border-slate-200 text-blue-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-600 hover:text-white transition-all">📞</a>
                                            <button onClick={() => handleSendReminder(s)} className="w-9 h-9 bg-white border border-slate-200 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-emerald-600 hover:text-white transition-all">🔔</button>
                                            <button onClick={() => onViewStudentProfile?.(s.id)} className="w-9 h-9 bg-white border border-slate-200 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-indigo-600 hover:text-white transition-all">👤</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {topDefaulters.length > 5 && (
                    <div className="mt-8 flex justify-center">
                        <button 
                            onClick={() => setShowAllDefaulters(!showAllDefaulters)} 
                            className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
                        >
                            {showAllDefaulters ? '🔼 View Less' : '🔽 View More Defaulters'}
                        </button>
                    </div>
                )}
            </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-200 p-8 md:p-10 flex flex-col group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-indigo-100 border border-indigo-400">📅</div>
                        <div><h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Schedule</p></div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[1.25rem] border border-slate-100 shadow-inner">
                        <button onClick={() => changeMonth(-1)} className="w-10 h-10 bg-white hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-black shadow-sm">◀</button>
                        <span className="font-black text-[10px] text-slate-600 px-4 min-w-[120px] text-center uppercase tracking-widest">{calendarDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                        <button onClick={() => changeMonth(1)} className="w-10 h-10 bg-white hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-black shadow-sm">▶</button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 text-center gap-3 flex-1">
                    {calendarDays.map((d, i) => {
                        const isToday = d === new Date().getDate() && calendarDate.getMonth() === new Date().getMonth() && calendarDate.getFullYear() === new Date().getFullYear();
                        return (
                            <div 
                                key={i} onClick={() => handleDateClick(d)}
                                className={`aspect-square flex flex-col items-center justify-center rounded-2xl transition-all group/day relative ${
                                    d ? isToday 
                                        ? 'bg-indigo-600 text-white shadow-2xl scale-110 ring-4 ring-indigo-50 z-10 cursor-pointer' 
                                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 cursor-pointer shadow-sm' 
                                    : 'opacity-0 pointer-events-none'
                                }`}
                            >
                                <span className="font-black text-base">{d}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">
                    <span>Click any date for audit log 👆</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span> Current Day</span>
                </div>
          </div>
          <div className="lg:col-span-4 bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col group h-full">
              <div className="p-8 bg-slate-900 text-white relative h-32 flex flex-col justify-center">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                  <h3 className="text-xl font-black uppercase tracking-tighter relative z-10">Institutional Portal</h3>
                  <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest relative z-10">Digital ID Verification</p>
              </div>
              <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-50/50">
                  <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border-4 border-slate-100 mb-6 relative hover:scale-105 transition-transform duration-500">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${data.schoolProfile.name}|${data.schoolProfile.address}`)}`} alt="School QR" className="w-44 h-44 rounded-xl" />
                  </div>
                  <h4 className="font-black text-slate-800 text-lg uppercase text-center leading-tight">{data.schoolProfile.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase text-center mt-1">Official Institutional Profile</p>
              </div>
          </div>
      </div>

      {isAuditModalOpen && isAdmin && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsAuditModalOpen(false)}>
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
                  <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 to-indigo-950 text-white relative flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                      <div className="relative z-10 text-center md:text-left">
                          <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Performance Audit Log</span>
                          <h2 className="text-2xl font-black tracking-tighter mt-1">{new Date(auditDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 relative z-10 justify-center">
                            <button onClick={() => onNavigateToSettings?.()} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 font-black text-[10px] uppercase tracking-widest transition-all">🖼️ Add Photo</button>
                            <button onClick={() => setIsAuditModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition-all shadow-inner">✕</button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 scrollbar-hide">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="bg-emerald-100/50 border border-emerald-100 p-5 rounded-[2rem] flex flex-col items-center">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Inflow</p>
                                <p className="text-2xl font-black text-emerald-700">{currency}{auditInflow.toLocaleString()}</p>
                           </div>
                           <div className="bg-rose-100/50 border border-rose-100 p-5 rounded-[2rem] flex flex-col items-center">
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Outflow</p>
                                <p className="text-2xl font-black text-rose-700">{currency}{auditOutflow.toLocaleString()}</p>
                           </div>
                           <div className="bg-indigo-100/50 border border-indigo-100 p-5 rounded-[2rem] flex flex-col items-center">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Performance</p>
                                <p className={`text-2xl font-black ${auditNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency}{Math.abs(auditNet).toLocaleString()}</p>
                           </div>
                      </div>

                      <div className="space-y-6">
                          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                               <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">🎓 New Admissions ({auditAdmissions.length})</h4>
                               <div className="space-y-2">
                                   {auditAdmissions.map(s => (
                                       <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-white border overflow-hidden shrink-0">{s.photo ? <img src={s.photo} className="w-full h-full object-cover"/> : <span className="flex h-full w-full items-center justify-center font-bold text-xs text-slate-300">{s.name.charAt(0)}</span>}</div>
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{s.name}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-indigo-600 bg-white px-2.5 py-1 rounded border border-indigo-50 shadow-sm uppercase">Class {s.grade}</span>
                                       </div>
                                   ))}
                                   {auditAdmissions.length === 0 && <p className="text-center text-[10px] font-bold text-slate-300 py-6 uppercase tracking-widest">No admissions recorded</p>}
                               </div>
                          </div>

                          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                               <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">📥 Collections Log</h4>
                               <div className="space-y-2">
                                   {auditCollections.map(f => (
                                       <div key={f.id} className="p-3 bg-emerald-50/50 rounded-xl flex items-center justify-between group border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{getFeeIcon(f.type)}</span>
                                                <div className="min-w-0">
                                                    <span className="text-[11px] font-black text-slate-700 uppercase block truncate">{data.students.find(s=>s.id===f.studentId)?.name || 'Archived'}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{f.type}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-emerald-600">{currency}{f.amount.toLocaleString()}</span>
                                                <button onClick={() => onDeleteFee?.(f.id)} className="text-rose-400 hover:text-rose-600 transition-colors">🗑️</button>
                                            </div>
                                       </div>
                                   ))}
                                   {auditCollections.length === 0 && <p className="text-center text-[10px] font-bold text-slate-300 py-6 uppercase tracking-widest">No inflow recorded</p>}
                               </div>
                          </div>

                          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                               <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">📤 Expenses Ledger</h4>
                               <div className="space-y-2">
                                   {auditExpenses.map(e => (
                                       <div key={e.id} className="p-3 bg-rose-50/50 rounded-xl flex items-center justify-between group border border-rose-100">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{getExpenseIcon(e.category)}</span>
                                                <div className="min-w-0">
                                                    <span className="text-[11px] font-black text-slate-700 uppercase block truncate">{e.title}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{e.category}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-rose-600">{currency}{e.amount.toLocaleString()}</span>
                                                <button onClick={() => onDeleteExpense?.(e.id)} className="text-rose-400 hover:text-rose-600 transition-colors">🗑️</button>
                                            </div>
                                       </div>
                                   ))}
                                   {auditExpenses.length === 0 && <p className="text-center text-[10px] font-bold text-slate-300 py-6 uppercase tracking-widest">No outflow recorded</p>}
                               </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
                       <button onClick={() => setIsAuditModalOpen(false)} className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Dismiss Audit Log</button>
                  </div>
              </div>
          </div>
      )}

      {!isAdmin && (
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h3 className="text-3xl font-black mb-8 flex items-center gap-3"><span>💰</span> My Fee Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                   <div className="bg-white/10 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-inner">
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">Remaining Balance</p>
                        <p className="text-4xl font-black tracking-tight"><AnimatedNumber value={totalDue} currency={currency} /></p>
                   </div>
                   <div className="bg-emerald-500/10 p-8 rounded-[2.5rem] border border-emerald-500/20 backdrop-blur-md shadow-inner">
                        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-3">Successfully Paid</p>
                        <p className="text-4xl font-black tracking-tight"><AnimatedNumber value={totalRevenue} currency={currency} /></p>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;