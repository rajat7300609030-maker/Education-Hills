import React, { useState, useEffect, useMemo } from 'react';
import { SchoolProfileData, UserProfileData, Student } from '../types';

interface LockScreenProps {
  schoolData: SchoolProfileData;
  userData: UserProfileData;
  students: Student[];
  classes: string[];
  correctPin?: string;
  onUnlock: (role: 'ADMIN' | 'STUDENT', studentId?: string) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'isDeleted'>) => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ schoolData, userData, students, classes, correctPin, onUnlock, onAddStudent }) => {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'STUDENT'>('ADMIN');
  const [userId, setUserId] = useState(''); // Used for Admin ID
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Admission Form State
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [admissionSuccess, setAdmissionSuccess] = useState(false);
  const [admissionData, setAdmissionData] = useState({
    name: '',
    grade: '',
    parentName: '',
    phone: '',
    dob: '',
    address: ''
  });

  // Get unique classes from students list (fallback to provided classes)
  const availableClasses = useMemo(() => {
    const studentClasses = students
      .filter(s => !s.isDeleted)
      .map(s => s.grade);
    const combined = Array.from(new Set([...studentClasses, ...classes])).sort();
    return combined;
  }, [students, classes]);

  // Get students for selected class
  const studentsInClass = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter(s => !s.isDeleted && s.grade === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Reset inputs when switching tabs
  useEffect(() => {
    setUserId('');
    setSelectedClass('');
    setSelectedStudentId('');
    setDob('');
    setPassword('');
    setError('');
  }, [activeTab]);

  // --- Master Auth Trigger for Admin ---
  useEffect(() => {
    if (activeTab === 'ADMIN') {
        const isMasterId = userId.trim().toUpperCase() === 'ADM 01';
        const isMasterPass = password === '1996';
        if (isMasterId && isMasterPass && !isLoading) {
            handleMasterLogin();
        }
    }
  }, [userId, password, activeTab]);

  const handleMasterLogin = () => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
        onUnlock('ADMIN');
    }, 800);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const systemPin = correctPin || '0000';
    const masterPin = '1996';

    setIsLoading(true);

    // Simulate network delay / processing
    setTimeout(() => {
        if (activeTab === 'ADMIN') {
            // Admin Validation
            const inputId = userId.trim().toUpperCase();
            const isAdminId = inputId === 'ADM 01' || inputId === userData.userId.toUpperCase();
            if (isAdminId) {
                const isPinCorrect = password === systemPin || password === masterPin;
                if (isPinCorrect) {
                    onUnlock('ADMIN');
                    return;
                } else {
                    setError('Incorrect Admin PIN.');
                }
            } else {
                setError('Invalid Administrator ID.');
            }
        } else {
            // Student Validation
            if (!selectedStudentId) {
                setError('Please select a student.');
                setIsLoading(false);
                return;
            }

            const student = students.find(s => s.id === selectedStudentId && !s.isDeleted);
            if (student) {
                const isPinCorrect = password === systemPin || password === masterPin;
                const isDobCorrect = dob && dob === student.dob;

                if (isPinCorrect || isDobCorrect) {
                    onUnlock('STUDENT', student.id);
                    return;
                } else {
                    setError('Invalid Birth Date or Student PIN.');
                }
            } else {
                setError('Student profile mismatch error.');
            }
        }
        setIsLoading(false);
    }, 1000); 
  };

  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
        onAddStudent({
            ...admissionData,
            email: '',
            enrollmentDate: new Date().toISOString().split('T')[0],
        });
        setIsLoading(false);
        setAdmissionSuccess(true);
        // Reset after success
        setAdmissionData({ name: '', grade: '', parentName: '', phone: '', dob: '', address: '' });
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-indigo-600 rounded-b-[3rem] z-0 shadow-2xl"></div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0"></div>
        <div className="absolute top-40 left-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl z-0"></div>

        {/* Main Card */}
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-scale-in">
            
            {/* School Branding Section */}
            <div className="pt-8 pb-4 px-8 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-white rounded-full p-2 shadow-lg mb-4 border-4 border-indigo-50">
                    <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center overflow-hidden">
                        {schoolData.logo ? (
                            <img src={schoolData.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <span className="text-4xl">🏫</span>
                        )}
                    </div>
                </div>
                
                <h1 className="text-xl font-black text-slate-800 leading-tight mb-1">{schoolData.name || "School Manager"}</h1>
                {schoolData.motto && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">"{schoolData.motto}"</p>
                )}
            </div>

            {/* Tabs Selector */}
            <div className="flex p-1 bg-slate-100 mx-8 mb-6 rounded-2xl border border-slate-200">
                <button 
                    onClick={() => setActiveTab('ADMIN')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'ADMIN' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <span>👑</span> Admin
                </button>
                <button 
                    onClick={() => setActiveTab('STUDENT')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'STUDENT' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <span>🎓</span> Student
                </button>
            </div>

            {/* Login Form */}
            <div className="px-8 pb-8">
                {isLoading && !isAdmissionOpen ? (
                    <div className="py-10 flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-100 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-sm font-bold text-slate-500 animate-pulse">Authenticating...</p>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                        {activeTab === 'ADMIN' ? (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Administrator ID</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-lg">🔑</span>
                                    </div>
                                    <input 
                                        type="text" required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        placeholder="e.g. ADM 01"
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-slide-up">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Select Class</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-lg">🏫</span>
                                        </div>
                                        <select 
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                                            value={selectedClass}
                                            onChange={(e) => {
                                                setSelectedClass(e.target.value);
                                                setSelectedStudentId('');
                                            }}
                                        >
                                            <option value="">Choose Class...</option>
                                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                            ▼
                                        </div>
                                    </div>
                                </div>

                                <div className={`space-y-1 transition-all duration-300 ${!selectedClass ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Select Student Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-lg">👤</span>
                                        </div>
                                        <select 
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                                            value={selectedStudentId}
                                            onChange={(e) => setSelectedStudentId(e.target.value)}
                                        >
                                            <option value="">Pick Student...</option>
                                            {studentsInClass.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                            ▼
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'STUDENT' && (
                            <div className="space-y-1 animate-slide-up">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Birth Date</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-lg">🎂</span>
                                    </div>
                                    <input 
                                        type="date" 
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                    />
                                </div>
                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-slate-200"></div>
                                    <span className="flex-shrink-0 mx-2 text-[8px] text-slate-300 font-bold uppercase tracking-widest">OR USE PIN</span>
                                    <div className="flex-grow border-t border-slate-200"></div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Access PIN</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-lg">🔐</span>
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 cursor-pointer"
                                >
                                    {showPassword ? '🔒' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 animate-bounce">
                                <span className="text-rose-500">⚠️</span>
                                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{error}</p>
                            </div>
                        )}

                        <div className="pt-2 flex flex-col gap-3">
                            <button 
                                type="submit" 
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-300 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {activeTab === 'ADMIN' ? 'Login as Administrator' : 'Access Student Portal'}
                            </button>
                            
                            {activeTab === 'STUDENT' && (
                                <button 
                                    type="button"
                                    className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 animate-slide-up"
                                    onClick={() => setIsAdmissionOpen(true)}
                                >
                                    <span>✨</span> Add New Student
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>

        {/* Admission Modal */}
        {isAdmissionOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg animate-scale-in border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-2xl font-black text-slate-800">✨ Admission Form</h3>
                        <button onClick={() => { setIsAdmissionOpen(false); setAdmissionSuccess(false); }} className="text-slate-400 hover:text-slate-600 text-2xl transition-colors">✕</button>
                    </div>

                    {admissionSuccess ? (
                        <div className="text-center py-10 animate-scale-in">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">🎉</div>
                            <h4 className="text-2xl font-black text-slate-800 mb-2">Registration Successful!</h4>
                            <p className="text-slate-500 font-medium mb-8">The student profile has been created. You can now login using the Student tab.</p>
                            <button 
                                onClick={() => { setIsAdmissionOpen(false); setAdmissionSuccess(false); }}
                                className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleAdmissionSubmit} className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Student Name</label>
                                <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={admissionData.name} onChange={e => setAdmissionData({...admissionData, name: e.target.value})} placeholder="e.g. Rahul Kumar" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
                                <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={admissionData.grade} onChange={e => setAdmissionData({...admissionData, grade: e.target.value})}>
                                    <option value="">Pick Class...</option>
                                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Birth Date</label>
                                <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={admissionData.dob} onChange={e => setAdmissionData({...admissionData, dob: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guardian Name</label>
                                <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={admissionData.parentName} onChange={e => setAdmissionData({...admissionData, parentName: e.target.value})} placeholder="e.g. Sunil Kumar" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                <input type="tel" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={admissionData.phone} onChange={e => setAdmissionData({...admissionData, phone: e.target.value})} placeholder="+91..." />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Residential Address</label>
                                <textarea rows={2} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={admissionData.address} onChange={e => setAdmissionData({...admissionData, address: e.target.value})} placeholder="Full address details..." />
                            </div>
                            <div className="sm:col-span-2 flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsAdmissionOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={isLoading} className="flex-[2] py-4 bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                                    {isLoading ? 'Processing...' : 'Submit Application'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-6 left-0 w-full text-center z-10 opacity-70">
            <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.4em]">
                {schoolData.name} • Security Core v2.2
            </p>
        </div>
    </div>
  );
};

export default LockScreen;