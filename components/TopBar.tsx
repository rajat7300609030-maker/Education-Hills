import React, { useState, useRef, useEffect } from 'react';
import { ViewState, UserProfileData, AppNotification } from '../types';

interface TopBarProps {
  currentView: ViewState;
  user: UserProfileData;
  session: string;
  notifications?: AppNotification[];
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenProfile: () => void;
  onClearNotifications?: () => void;
  userRole?: 'ADMIN' | 'STUDENT';
  enableHapticFeedback?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ 
  currentView, 
  user, 
  session, 
  notifications = [], 
  isSidebarCollapsed, 
  onToggleSidebar, 
  onOpenProfile,
  onClearNotifications,
  userRole = 'ADMIN',
  enableHapticFeedback
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  const getTitle = (view: ViewState) => {
    switch(view) {
      case ViewState.DASHBOARD: return '📊 Dashboard';
      case ViewState.STUDENTS: return '🎓 Students';
      case ViewState.STUDENT_PROFILE: return '👤 Student Profile';
      case ViewState.PARENT_PROFILE: return '👨‍👩‍👧‍👦 Parent Profile';
      case ViewState.EMPLOYEES: return '👔 Employees';
      case ViewState.EMPLOYEE_PROFILE: return '👤 Employee Profile';
      case ViewState.FEES: return '💰 Fees Manager';
      case ViewState.EXPENSES: return '💸 Expenses';
      case ViewState.RECYCLE_BIN: return '🗑️ Recycle Bin';
      case ViewState.SCHOOL_PROFILE: return '🏫 School Profile';
      case ViewState.USER_PROFILE: return '👤 User Profile';
      case ViewState.SETTINGS: return '⚙️ App Settings';
      default: return '🏫 EmojiSchool';
    }
  };

  const getGradientClass = (view: ViewState) => {
    switch(view) {
      case ViewState.DASHBOARD: return 'from-slate-900 via-slate-800 to-gray-900';
      case ViewState.STUDENTS: 
      case ViewState.STUDENT_PROFILE:
      case ViewState.PARENT_PROFILE: return 'from-blue-900 via-indigo-900 to-violet-900';
      case ViewState.EMPLOYEES:
      case ViewState.EMPLOYEE_PROFILE: return 'from-amber-900 via-orange-900 to-yellow-900';
      case ViewState.FEES: return 'from-emerald-900 via-teal-900 to-cyan-900';
      case ViewState.EXPENSES: return 'from-red-900 via-rose-900 to-pink-900';
      case ViewState.RECYCLE_BIN: return 'from-gray-900 via-stone-900 to-neutral-900';
      case ViewState.SCHOOL_PROFILE: return 'from-purple-900 via-fuchsia-900 to-pink-900';
      case ViewState.USER_PROFILE: return 'from-indigo-900 via-blue-900 to-sky-900';
      case ViewState.SETTINGS: return 'from-slate-800 via-gray-800 to-zinc-800';
      default: return 'from-slate-900 to-slate-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'success': return '✅';
      case 'error': return '🚨';
      default: return 'ℹ️';
    }
  };

  return (
    <header className={`min-h-[5rem] pt-[env(safe-area-inset-top)] bg-gradient-to-r ${getGradientClass(currentView)} shadow-2xl flex items-center justify-between px-4 md:px-8 z-40 shrink-0 transition-all duration-500 ease-in-out border-b border-white/10`}>
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden h-16">
        <button 
          onClick={() => {
            if (enableHapticFeedback && window.navigator.vibrate) {
              window.navigator.vibrate(20);
            }
            onToggleSidebar();
          }}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 border border-white/5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter whitespace-nowrap animate-fade-in">
            {getTitle(currentView)}
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{session} Session</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 relative">
        {/* Notifications */}
        <div className="relative" ref={popoverRef}>
          <button 
            onClick={() => {
              if (enableHapticFeedback && window.navigator.vibrate) {
                window.navigator.vibrate(15);
              }
              setIsNotificationOpen(!isNotificationOpen);
            }}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white relative transition-all active:scale-95 border border-white/5"
          >
            <span className="text-xl">🔔</span>
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-4 w-72 md:w-80 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden animate-scale-in z-[60]">
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Alerts & Logs</h4>
                <button onClick={() => setIsNotificationOpen(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
              </div>
              <div className="max-h-[350px] overflow-y-auto scrollbar-hide divide-y divide-slate-50">
                {notifications.length > 0 ? notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                    <span className="text-xl shrink-0">{getNotificationIcon(n.type)}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-700 leading-tight">{n.message}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase mt-1">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center">
                    <span className="text-4xl block mb-2 opacity-20">🍃</span>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No New Alerts</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <button 
                  onClick={() => {
                    if (onClearNotifications) onClearNotifications();
                    setIsNotificationOpen(false);
                  }}
                  disabled={notifications.length === 0}
                  className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline flex items-center justify-center gap-2 w-full"
                >
                  <span>🗑️</span>
                  <span>Clear history</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Quick Access - Only visible for Admins */}
        {isAdmin && (
          <button 
            onClick={() => {
              if (enableHapticFeedback && window.navigator.vibrate) {
                window.navigator.vibrate(25);
              }
              onOpenProfile();
            }}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/5 active:scale-95 group"
          >
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-[1rem] bg-white border-2 border-indigo-500 shadow-lg overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
              {user.photo ? (
                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-lg font-black text-indigo-600">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="hidden md:flex flex-col items-start text-left">
              <p className="text-sm font-black text-white leading-none">{user.name}</p>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;