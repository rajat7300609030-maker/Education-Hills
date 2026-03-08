import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, FeeRecord } from '../types';
import { submitToFormspree } from '../lib/formspree';

interface StudentsProps {
  students: Student[];
  classes: string[];
  fees: FeeRecord[];
  currency: string;
  onAddStudent: (student: Omit<Student, 'id' | 'isDeleted'>) => void;
  onDeleteStudent: (id: string) => void;
  onEditStudent: (student: Student) => void;
  onAddClass: (className: string) => void;
  onDeleteClass: (className: string) => void;
  onNavigateToFees: (studentId: string) => void;
  onViewProfile: (studentId: string) => void;
  onViewParent: (student: Student) => void;
  animationStyle?: 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'flip';
  initialEditingId?: string | null;
  onClearEditingId?: () => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'id-asc' | 'id-desc' | 'date-new' | 'date-old' | 'fees-high' | 'fees-low';

const Students: React.FC<StudentsProps> = ({ 
    students, 
    classes, 
    fees,
    currency,
    animationStyle = 'slideUp',
    onAddStudent, 
    onDeleteStudent, 
    onEditStudent, 
    onAddClass, 
    onDeleteClass,
    onNavigateToFees,
    onViewProfile,
    onViewParent,
    initialEditingId,
    onClearEditingId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  
  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [showRestrictedModal, setShowRestrictedModal] = useState<{ isOpen: boolean, studentName: string }>({ isOpen: false, studentName: '' });
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  // New Class Input State
  const [newClassName, setNewClassName] = useState('');
  const [classToDelete, setClassToDelete] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Student Form State
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    parentName: '',
    phone: '',
    email: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    photo: '',
    dob: '',
    address: '',
    totalAgreedFees: 0,
    backLogs: 0
  });

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialEditingId) {
        const student = students.find(s => s.id === initialEditingId);
        if (student) {
            openForm(student);
            if (onClearEditingId) onClearEditingId();
        }
    }
  }, [initialEditingId, students]);

  const activeStudents = useMemo(() => {
    let filtered = students.filter(s => 
      !s.isDeleted && 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedClass === 'All' || s.grade === selectedClass)
    );

    // Apply Sorting
    return filtered.sort((a, b) => {
      const getDue = (student: Student) => {
        const studentFees = fees.filter(f => f.studentId === student.id && !f.isDeleted);
        const totalLiability = (student.totalAgreedFees || 0) + (student.backLogs || 0);
        const paidFees = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
        return totalLiability - paidFees;
      };

      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'id-asc': return a.id.localeCompare(b.id, undefined, { numeric: true });
        case 'id-desc': return b.id.localeCompare(a.id, undefined, { numeric: true });
        case 'date-new': return new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime();
        case 'date-old': return new Date(a.enrollmentDate).getTime() - new Date(b.enrollmentDate).getTime();
        case 'fees-high': return getDue(b) - getDue(a);
        case 'fees-low': return getDue(a) - getDue(b);
        default: return 0;
      }
    });
  }, [students, searchTerm, selectedClass, sortBy, fees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitToFormspree(editingId ? 'Edit Student Admission' : 'New Student Admission', {
      ...formData,
      editing_id: editingId || 'N/A'
    });

    if (editingId) {
      const original = students.find(s => s.id === editingId);
      if (original) {
        onEditStudent({ ...original, ...formData });
      }
    } else {
      onAddStudent(formData);
    }
    closeForm();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
        onAddClass(newClassName.trim());
        setNewClassName('');
        setIsClassModalOpen(false);
    }
  };

  const handleDeleteClassConfirm = (e: React.FormEvent) => {
      e.preventDefault();
      if (classToDelete) {
          const enrolledStudents = students.filter(s => !s.isDeleted && s.grade === classToDelete).length;
          if (enrolledStudents > 0) {
              setDeleteError(`Cannot delete class "${classToDelete}". It has ${enrolledStudents} active student(s).`);
              return;
          }
          onDeleteClass(classToDelete);
          setIsDeleteClassModalOpen(false);
          if (selectedClass === classToDelete) {
              setSelectedClass('All');
          }
          setClassToDelete('');
          setDeleteError('');
      }
  };

  const handleDeleteRequest = (student: Student) => {
    const hasPaidFees = fees.some(f => f.studentId === student.id && f.status === 'Paid' && !f.isDeleted);
    if (hasPaidFees) {
        setShowRestrictedModal({ isOpen: true, studentName: student.name });
    } else {
        setStudentToDelete(student);
    }
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      onDeleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  const openForm = (student?: Student) => {
    if (student) {
      setEditingId(student.id);
      setFormData({
        name: student.name,
        grade: student.grade,
        parentName: student.parentName,
        phone: student.phone,
        email: student.email,
        enrollmentDate: student.enrollmentDate,
        photo: student.photo || '',
        dob: student.dob || '',
        address: student.address || '',
        totalAgreedFees: student.totalAgreedFees || 0,
        backLogs: student.backLogs || 0
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        grade: selectedClass !== 'All' ? selectedClass : (classes[0] || ''),
        parentName: '',
        phone: '',
        email: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        photo: '',
        dob: '',
        address: '',
        totalAgreedFees: 0,
        backLogs: 0
      });
    }
    setIsFormOpen(true);
    setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setTimeout(() => setEditingId(null), 300);
  };

  const getStudentTheme = (pct: number) => {
    if (pct <= 16) return { bar: 'bg-gradient-to-r from-red-500 via-red-600 to-rose-600', card: 'bg-gradient-to-br from-red-50 via-white to-white', border: 'border-red-100 hover:border-red-300', badge: 'bg-red-100 text-red-700', text: 'text-red-700', pulse: 'animate-pulse' };
    if (pct <= 33) return { bar: 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600', card: 'bg-gradient-to-br from-orange-50 via-white to-white', border: 'border-orange-100 hover:border-orange-300', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-700', pulse: 'animate-pulse-subtle' };
    if (pct <= 50) return { bar: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-yellow-600', card: 'bg-gradient-to-br from-yellow-50 via-white to-white', border: 'border-yellow-100 hover:border-yellow-300', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700', pulse: '' };
    if (pct <= 66) return { bar: 'bg-gradient-to-r from-teal-400 via-teal-500 to-cyan-600', card: 'bg-gradient-to-br from-teal-50 via-white to-white', border: 'border-teal-100 hover:border-teal-300', badge: 'bg-teal-100 text-teal-700', text: 'text-teal-700', pulse: '' };
    if (pct <= 83) return { bar: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600', card: 'bg-gradient-to-br from-blue-50 via-white to-white', border: 'border-blue-100 hover:border-blue-300', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700', pulse: '' };
    return { bar: 'bg-gradient-to-r from-emerald-500 via-green-500 to-lime-600', card: 'bg-gradient-to-br from-emerald-50 via-white to-white', border: 'border-emerald-100 hover:border-emerald-300', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700', pulse: '' };
  };

  const getFeesStatusLabel = (pct: number) => {
    if (pct >= 100) return 'Paid';
    if (pct > 0) return 'Partial';
    return 'Unpaid';
  };

  return (
    <div className="space-y-3 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="animate-fade-in">
          <h2 className="text-3xl font-bold text-slate-800">Students 🎓</h2>
          <p className="text-slate-500">Manage student enrollments, profiles and fees.</p>
        </div>
        <div className="flex gap-2 items-center">
            <button 
                onClick={() => isFormOpen && !editingId ? closeForm() : openForm()}
                className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all duration-300 active:scale-95 flex items-center gap-2 whitespace-nowrap text-sm w-fit ${
                    isFormOpen && !editingId 
                    ? 'bg-slate-800 text-white shadow-slate-300' 
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-indigo-200 hover:shadow-indigo-400'
                }`}
            >
                {isFormOpen && !editingId ? (
                    <><span>✖️</span> <span>Close Form</span></>
                ) : (
                    <><span>➕</span> <span>Add New Student</span></>
                )}
            </button>
        </div>
      </header>

      <div 
        ref={formRef}
        className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFormOpen ? 'grid-rows-[1fr] opacity-100 mb-6' : 'grid-rows-[0fr] opacity-0 mb-0'}`}
      >
        <div className="overflow-hidden">
             <div className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {editingId ? <span>✏️ Edit Student</span> : <span>✨ Add New Student</span>}
                    </h3>
                    <button onClick={closeForm} type="button" className="text-slate-400 hover:text-slate-600 transition-colors text-2xl">✕</button>
                </div>
                <form id="student-form" onSubmit={handleSubmit} className="relative z-10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-5">
                             <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider border-b border-indigo-100 pb-2">Profile Info</h4>
                             <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 relative group transition-transform hover:scale-105">
                                    {formData.photo ? <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-2xl text-slate-400">📷</span>}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePhotoUpload} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-500 mb-1">Student Photo</p>
                                    <p className="text-[10px] text-slate-400">Click to upload image.</p>
                                </div>
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">👤 Full Name *</label>
                                <input required type="text" placeholder="e.g. John Doe" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">🎂 DOB</label>
                                    <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-600" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">📅 Joined</label>
                                    <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-600" value={formData.enrollmentDate} onChange={e => setFormData({...formData, enrollmentDate: e.target.value})} />
                                </div>
                             </div>
                        </div>
                        <div className="space-y-5">
                             <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider border-b border-indigo-100 pb-2">Contact & Academic</h4>
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">🎓 Class *</label>
                                    <select required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} >
                                        <option value="" disabled>Select Class...</option>
                                        {classes.map(c => <option key={c} value={c}>🏫 {c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">👪 Parent</label>
                                    <input required type="text" placeholder="Guardian" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
                                </div>
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">📞 Phone</label>
                                <input type="tel" placeholder="Mobile" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">🏠 Full Address</label>
                                <textarea rows={2} placeholder="Street, City" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-5 flex flex-col h-full">
                             <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider border-b border-indigo-100 pb-2">Financials</h4>
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">💰 Annual Fee</label>
                                    <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.totalAgreedFees} onChange={e => setFormData({...formData, totalAgreedFees: parseFloat(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">📉 Back Fees</label>
                                    <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.backLogs} onChange={e => setFormData({...formData, backLogs: parseFloat(e.target.value)})} />
                                </div>
                             </div>
                             <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 font-medium">
                                ℹ️ Back Fees will be added to the student's due balance.
                             </div>
                             <div className="flex-1"></div>
                             <div className="flex gap-3 mt-4">
                                <button type="button" onClick={closeForm} className="flex-1 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold border border-slate-200 transition-colors">Cancel</button>
                                <button type="submit" className="flex-[2] px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg active:scale-95">
                                    {editingId ? '💾 Save Changes' : '✅ Add Student'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
             </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 animate-fade-in">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input type="text" placeholder="Search students..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="pl-4 pr-10 py-2.5 rounded-lg border border-slate-100 font-bold text-slate-700 bg-slate-50 outline-none transition-all focus:ring-2 focus:ring-indigo-500">
                <option value="All">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
                 <button onClick={() => setIsClassModalOpen(true)} className="p-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-100 transition-all active:scale-90" title="Add Class">➕</button>
                 <button onClick={() => setIsDeleteClassModalOpen(true)} className="p-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-100 transition-all active:scale-90" title="Delete Class">🗑️</button>
                 
                 {/* Sort Dropdown - SHOW ONLY EMOJIS */}
                 <div className="relative group/sort">
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="appearance-none p-1.5 pl-3 pr-8 bg-indigo-50 text-indigo-700 rounded-lg font-black border border-indigo-100 hover:bg-indigo-100 transition-all outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95 cursor-pointer text-xl shadow-sm text-center"
                        title="Sort Students"
                    >
                        <optgroup label="Name">
                            <option value="name-asc">🔠</option>
                            <option value="name-desc">🔤</option>
                        </optgroup>
                        <optgroup label="System ID">
                            <option value="id-asc">🔢</option>
                            <option value="id-desc">🆔</option>
                        </optgroup>
                        <optgroup label="Enrollment">
                            <option value="date-new">🆕</option>
                            <option value="date-old">📅</option>
                        </optgroup>
                        <optgroup label="Financials">
                            <option value="fees-high">📈</option>
                            <option value="fees-low">📉</option>
                        </optgroup>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-indigo-400 group-hover/sort:text-indigo-600 transition-colors">
                        ▼
                    </div>
                 </div>
            </div>
        </div>
      </div>

      <div className="pb-12">
        {activeStudents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeStudents.map((student, index) => {
              const studentFees = fees.filter(f => f.studentId === student.id && !f.isDeleted);
              const totalLiability = (student.totalAgreedFees || 0) + (student.backLogs || 0);
              const paidFees = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
              const dueFees = totalLiability - paidFees;
              const paidPercentage = totalLiability > 0 ? Math.round((paidFees / totalLiability) * 100) : 0;
              const theme = getStudentTheme(paidPercentage);
              const isActive = activeCardId === student.id;
              const statusLabel = getFeesStatusLabel(paidPercentage);

              return (
              <div 
                key={student.id} 
                onClick={() => setActiveCardId(isActive ? null : student.id)} 
                className={`stagger-item animate-${animationStyle} group relative rounded-2xl border transition-all duration-500 flex flex-col overflow-hidden cursor-pointer ${theme.card} ${theme.border} ${isActive ? 'shadow-2xl scale-[1.05] z-30' : 'shadow-sm hover:shadow-xl hover:-translate-y-1'}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`h-1.5 w-full ${theme.bar} ${theme.pulse}`} />
                
                {/* Fees Status Badge (Top Right Corner) */}
                {!isActive && (
                    <div className="absolute top-4 right-4 flex flex-col items-end z-20">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border ${theme.badge} ring-1 ring-white/50 backdrop-blur-sm transition-all ${theme.pulse}`}>
                            {statusLabel}
                        </span>
                    </div>
                )}

                <div className="p-4 pb-3 relative flex-1 flex flex-col">
                    <div className="flex items-start gap-4 mb-3">
                        {/* Photo & ID Column */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0 transition-transform group-hover:scale-110 duration-500">
                            <div className="w-16 h-16 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center text-2xl relative z-10 overflow-hidden">
                                {student.photo ? <img src={student.photo} className="w-full h-full object-cover" /> : <span className="font-bold text-slate-500">{student.name.charAt(0)}</span>}
                            </div>
                            {/* Student ID below photo */}
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm ring-1 ring-white`}>{student.id}</span>
                        </div>

                        <div className="flex-1 min-w-0 pt-1">
                            <h3 className="text-base font-black text-slate-800 leading-tight truncate pr-14 group-hover:text-indigo-600 transition-colors duration-300">{student.name}</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.badge} border border-transparent shadow-sm ring-2 ring-white`}>Class {student.grade}</span>
                            </div>
                            <div className="mt-2.5 space-y-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <p className="text-[10px] text-slate-500 font-bold truncate">👨‍👩‍👧 {student.parentName}</p>
                                <p className="text-[10px] text-slate-500 font-bold">📞 {student.phone || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-full h-px bg-slate-100/50 mb-3" />
                    <div className="relative min-h-[60px]">
                        {isActive ? (
                            <div className="grid grid-cols-5 gap-1.5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onViewProfile(student.id); }} 
                                    className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 shadow-sm transition-all group/btn hover:scale-110 active:scale-95 animate-scale-in stagger-1" 
                                    title="Profile"
                                >
                                    <span className="text-xl group-hover/btn:scale-110 transition-transform">👤</span>
                                    <span className="text-[7px] font-black uppercase mt-0.5">Profile</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onNavigateToFees(student.id); }} 
                                    className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 shadow-sm transition-all group/btn hover:scale-110 active:scale-95 animate-scale-in stagger-2" 
                                    title="Fees"
                                >
                                    <span className="text-xl group-hover/btn:scale-110 transition-transform">💳</span>
                                    <span className="text-[7px] font-black uppercase mt-0.5">Fees</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onViewParent(student); }} 
                                    className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 shadow-sm transition-all group/btn hover:scale-110 active:scale-95 animate-scale-in stagger-3" 
                                    title="Parent"
                                >
                                    <span className="text-xl group-hover/btn:scale-110 transition-transform">👨‍👩‍👦</span>
                                    <span className="text-[7px] font-black uppercase mt-0.5">Parent</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); openForm(student); }} 
                                    className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 shadow-sm transition-all group/btn hover:scale-110 active:scale-95 animate-scale-in stagger-4" 
                                    title="Edit"
                                >
                                    <span className="text-xl group-hover/btn:scale-110 transition-transform">✏️</span>
                                    <span className="text-[7px] font-black uppercase mt-0.5">Edit</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRequest(student); }} 
                                    className="flex flex-col items-center justify-center p-1 rounded-lg bg-white border border-slate-200 text-red-600 hover:bg-red-50 shadow-sm transition-all group/btn hover:scale-110 active:scale-95 animate-scale-in stagger-5" 
                                    title="Delete"
                                >
                                    <span className="text-xl group-hover/btn:scale-110 transition-transform">🗑️</span>
                                    <span className="text-[7px] font-black uppercase mt-0.5">Delete</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 animate-fade-in">
                                <div className="grid grid-cols-3 gap-1 text-center">
                                    <div className="transition-transform group-hover:scale-110"><p className="text-[8px] font-bold text-slate-400 uppercase">Total</p><p className="text-[10px] font-black text-blue-700">{currency}{totalLiability.toLocaleString()}</p></div>
                                    <div className="transition-transform group-hover:scale-110"><p className="text-[8px] font-bold text-slate-400 uppercase">Paid</p><p className="text-[10px] font-black text-emerald-600">{currency}{paidFees.toLocaleString()}</p></div>
                                    <div className="transition-transform group-hover:scale-110"><p className="text-[8px] font-bold text-slate-400 uppercase">Due</p><p className="text-[10px] font-black text-red-600">{currency}{dueFees.toLocaleString()}</p></div>
                                </div>
                                
                                <div className="pt-0.5">
                                    <div className="flex justify-between items-center mb-0.5 px-0.5">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Fees Payment:</span>
                                        <span className={`text-[9px] font-black ${theme.text}`}>{paidPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full rounded-full transition-all duration-1000 animate-bar-glow ${theme.bar}`} style={{width: `${paidPercentage}%`}} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed animate-pulse-subtle">
            <span className="text-4xl mb-2 animate-float">🎓</span>
            <p className="font-medium">No students found matching your criteria.</p>
          </div>
        )}
      </div>

      {showRestrictedModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm text-center animate-scale-in border border-slate-100">
                <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-rose-100">
                    🚫
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Restricted Action</h3>
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    Student <strong>{showRestrictedModal.studentName}</strong> has existing fee payment records. Students with financial history cannot be deleted for audit security.
                </p>
                <button 
                    onClick={() => setShowRestrictedModal({ isOpen: false, studentName: '' })}
                    className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    OK, I Understand
                </button>
            </div>
        </div>
      )}

      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm text-center animate-scale-in border border-slate-100">
                <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-amber-100">
                    🗑️
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Delete Student?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    Are you sure you want to move <strong>{studentToDelete.name}</strong> to the Recycle Bin?
                </p>
                <div className="flex gap-4">
                  <button 
                      onClick={() => setStudentToDelete(null)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                      No, Keep
                  </button>
                  <button 
                      onClick={confirmDelete}
                      className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                  >
                      Yes, Delete
                  </button>
                </div>
            </div>
        </div>
      )}

      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
             <h3 className="text-lg font-bold mb-4">Add New Class</h3>
             <form onSubmit={handleAddClassSubmit} className="space-y-4">
                <input autoFocus required type="text" placeholder="e.g. 10-C" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                <div className="flex justify-end gap-3 mt-6">
                   <button type="button" onClick={() => setIsClassModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold transition-colors hover:text-slate-700">Cancel</button>
                   <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 hover:bg-green-700">Add Class</button>
                </div>
             </form>
          </div>
        </div>
      )}
      {isDeleteClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
             <h3 className="text-lg font-bold mb-4 text-red-600">Delete Class</h3>
             {deleteError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg animate-bounce">⚠️ {deleteError}</div>}
             <form onSubmit={handleDeleteClassConfirm} className="space-y-4">
                <select required className="w-full p-2.5 border rounded-xl outline-none bg-white font-bold transition-all focus:ring-2 focus:ring-red-500" value={classToDelete} onChange={e => setClassToDelete(e.target.value)}>
                    <option value="" disabled>Select a class...</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex justify-end gap-3 mt-6">
                   <button type="button" onClick={() => setIsDeleteClassModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold transition-colors hover:text-slate-700">Cancel</button>
                   <button type="submit" disabled={!classToDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md disabled:opacity-50 transition-all active:scale-95 hover:bg-red-700">Delete</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;