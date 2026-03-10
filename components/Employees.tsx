import React, { useState, useMemo } from 'react';
import { Employee, ExpenseRecord } from '../types';

interface EmployeesProps {
  employees: Employee[];
  expenses: ExpenseRecord[];
  currency: string;
  animationStyle?: string;
  onAddEmployee: (employee: Omit<Employee, 'id' | 'isDeleted'>) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onViewProfile?: (id: string) => void;
  onViewPayment?: (id: string) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const Employees: React.FC<EmployeesProps> = ({ employees, expenses, currency, animationStyle = 'slideUp', onAddEmployee, onEditEmployee, onDeleteEmployee, onViewProfile, onViewPayment, onNotify }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'isDeleted'>>({
    name: '',
    role: 'Teacher',
    salary: 0,
    phone: '',
    email: '',
    joiningDate: new Date().toISOString().split('T')[0],
    dob: '',
    password: '',
    status: 'Active',
    photo: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => !e.isDeleted && e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onEditEmployee({ ...formData, id: editingId, isDeleted: false });
    } else {
      onAddEmployee(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'Teacher',
      salary: 0,
      phone: '',
      email: '',
      joiningDate: new Date().toISOString().split('T')[0],
      dob: '',
      password: '',
      status: 'Active',
      photo: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
    setShowPassword(false);
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setFormData({
      name: employee.name,
      role: employee.role,
      salary: employee.salary,
      phone: employee.phone,
      email: employee.email,
      joiningDate: employee.joiningDate,
      dob: employee.dob || '',
      password: employee.password || '',
      status: employee.status,
      photo: employee.photo || ''
    });
    setIsFormOpen(true);
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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Employees 👔</h2>
          <p className="text-slate-500 font-medium">Manage staff, faculty, and payroll profiles.</p>
        </div>
        <button 
          onClick={() => isFormOpen && !editingId ? resetForm() : setIsFormOpen(true)}
          className={`px-6 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
            isFormOpen && !editingId 
            ? 'bg-slate-800 text-white shadow-slate-200' 
            : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
          }`}
        >
          {isFormOpen && !editingId ? (
            <><span>✖️</span> Close Form</>
          ) : (
            <><span>➕</span> Add New Employee</>
          )}
        </button>
      </header>

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md animate-scale-in border border-slate-100 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
            <div className="mb-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
                ⚠️
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Are you sure?</h3>
              <p className="text-slate-500 font-bold">
                You are about to delete <span className="text-rose-500">{deletingEmployee.name}</span>. This action will move the employee to the Recycle Bin.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeletingEmployee(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                No, Cancel
              </button>
              <button 
                onClick={() => {
                  onDeleteEmployee(deletingEmployee.id);
                  setDeletingEmployee(null);
                  onNotify?.(`Employee ${deletingEmployee.name} deleted successfully`, 'success');
                }}
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-2xl animate-scale-in border border-slate-100 relative overflow-hidden flex flex-col max-h-[90vh]">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             
             <div className="flex justify-between items-center mb-8 relative z-10 shrink-0">
                <h3 className="text-2xl font-black text-slate-800">{editingId ? '✏️ Edit Profile' : '✨ New Staff Registry'}</h3>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-2xl transition-colors">✕</button>
             </div>

             <form onSubmit={handleSubmit} className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 scrollbar-hide pb-4">
                <div className="md:col-span-2 flex items-center gap-6 mb-2">
                    <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 relative overflow-hidden group">
                        {formData.photo ? (
                            <img src={formData.photo} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                            <>
                                <span className="text-3xl">📷</span>
                                <span className="text-[9px] font-black uppercase mt-1">Upload</span>
                            </>
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                    <div>
                        <p className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Employee Photo</p>
                        <p className="text-[10px] text-slate-400 font-medium italic">High resolution JPG/PNG recommended</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Smith" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                        {['Teacher', 'Principal', 'Admin Staff', 'Librarian', 'Technician', 'Security', 'Maintenance', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary ({currency})</label>
                    <input required type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} placeholder="0.00" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Joining Date</label>
                    <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                    <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                    <input required type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 ..." />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="staff@school.com" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Password</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            placeholder="••••••••" 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                            {showPassword ? '👁️' : '🔒'}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employment Status</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'Active' | 'Resigned'})}>
                        <option value="Active">Active</option>
                        <option value="Resigned">Resigned</option>
                    </select>
                </div>

                <div className="md:col-span-2 flex gap-4 pt-4 sticky bottom-0 bg-white">
                    <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                        {editingId ? 'Update Profile' : 'Add to Records'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* SEARCH AND LIST */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <span className="text-xl">🔍</span>
          <input 
            type="text" className="flex-1 bg-transparent font-bold outline-none text-slate-700" 
            placeholder="Search employees by name..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeEmployees.map((emp, idx) => (
              <div 
                key={emp.id} 
                onClick={() => setActiveCardId(activeCardId === emp.id ? null : emp.id)}
                className={`stagger-item animate-${animationStyle} group bg-white rounded-[2rem] p-6 border-2 border-slate-50 hover:border-indigo-100 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden relative flex flex-col h-full cursor-pointer ${activeCardId === emp.id ? 'ring-2 ring-indigo-500 ring-offset-4' : ''}`} 
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -translate-y-6 translate-x-6 transition-transform group-hover:scale-110"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 z-20">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border ${
                          emp.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                          {emp.status}
                      </span>
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start gap-4 mb-6">
                           <div className="w-16 h-16 rounded-[1.25rem] bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform duration-500">
                               {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" /> : <span className="font-black text-slate-400">{emp.name.charAt(0)}</span>}
                           </div>
                           <div className="min-w-0 pr-12">
                               <h4 className="font-black text-slate-800 text-lg leading-tight truncate">{emp.name}</h4>
                               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{emp.role}</p>
                               <p className="text-[9px] font-bold text-slate-400 mt-0.5">{emp.id}</p>
                           </div>
                      </div>

                      <div className="space-y-3 mb-6 flex-1">
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <span className="text-lg">📞</span> {emp.phone}
                               <a 
                                 href={`tel:${emp.phone}`} 
                                 onClick={(e) => e.stopPropagation()}
                                 className="ml-auto p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                               >
                                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                   </svg>
                               </a>
                           </div>
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 truncate">
                               <span className="text-lg">📧</span> {emp.email || 'No Email'}
                           </div>
                           <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between mt-4">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Salary</span>
                               <span className="font-black text-slate-800">{currency}{emp.salary.toLocaleString()}</span>
                           </div>

                           <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex items-center justify-between mt-2">
                               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Paid (All Time)</span>
                               <span className="font-black text-emerald-700">
                                   {currency}
                                   {expenses
                                       .filter(e => !e.isDeleted && e.category === 'Salary' && (e.title.toLowerCase().includes(emp.name.toLowerCase()) || e.title.includes(emp.id)))
                                       .reduce((sum, e) => sum + e.amount, 0)
                                       .toLocaleString()}
                               </span>
                           </div>
                      </div>

                      {/* Animated Actions Overlay */}
                      <div className={`grid grid-cols-2 gap-2 mt-4 transition-all duration-300 origin-bottom ${activeCardId === emp.id ? 'opacity-100 translate-y-0 scale-100 h-auto' : 'opacity-0 translate-y-4 scale-95 h-0 overflow-hidden'}`}>
                           <button 
                             onClick={(e) => { e.stopPropagation(); onViewProfile?.(emp.id); }} 
                             className="py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-1"
                           >
                             <span>👤</span> Profile
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); onViewPayment?.(emp.id); }} 
                             className="py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1"
                           >
                             <span>💳</span> Payment
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleEdit(emp); }} 
                             className="py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1"
                           >
                             <span>✏️</span> Edit
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setDeletingEmployee(emp); }} 
                             className="py-2.5 bg-rose-50 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-1"
                           >
                             <span>🗑️</span> Delete
                           </button>
                      </div>

                      {/* Hint when not active */}
                      {activeCardId !== emp.id && (
                        <div className="text-center mt-2 animate-pulse">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Click to manage</span>
                        </div>
                      )}
                  </div>
              </div>
          ))}
          {activeEmployees.length === 0 && (
              <div className="col-span-full py-32 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400">
                  <span className="text-6xl mb-4">👥</span>
                  <p className="font-black text-xl uppercase tracking-widest">No Staff Found</p>
                  <p className="text-sm font-bold opacity-60 mt-2 mb-6">Start by adding your first employee.</p>
                  <button 
                    onClick={() => setIsFormOpen(true)}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>✨</span> Register New Employee
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default Employees;