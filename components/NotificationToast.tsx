import React, { useEffect, useState } from 'react';

interface NotificationToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  styleVariant?: 'Modern' | 'Minimal' | 'Vibrant' | 'Glass' | 'Pill' | 'Retro' | 'Dark' | 'Gradient' | 'Outline' | 'Float';
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, styleVariant = 'Modern', onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsExiting(false);
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const getStyleConfig = () => {
    // Base colors
    const colors = {
      success: { base: 'emerald', hex: '#10b981', dark: 'emerald-900', text: 'emerald-800' },
      error: { base: 'rose', hex: '#f43f5e', dark: 'rose-900', text: 'rose-800' },
      info: { base: 'indigo', hex: '#6366f1', dark: 'indigo-900', text: 'indigo-800' }
    };
    const c = colors[type];

    const icons = {
      success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
      ),
      error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      ),
      info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      )
    };

    switch (styleVariant) {
      case 'Minimal':
        return {
          wrapper: `bg-white border border-slate-200 shadow-sm rounded-lg p-3 items-center`,
          iconWrapper: `text-${c.base}-500 mr-3`,
          content: `text-slate-600 text-sm font-medium`,
          progress: `bg-${c.base}-500 opacity-20`
        };
      case 'Vibrant':
        return {
          wrapper: `bg-${c.base}-500 text-white shadow-lg rounded-xl p-4 items-start`,
          iconWrapper: `bg-white/20 text-white rounded-full p-1 mr-3`,
          content: `text-white font-semibold text-sm`,
          closeBtn: `text-white/70 hover:text-white`,
          progress: `bg-white opacity-30`
        };
      case 'Glass':
        return {
          wrapper: `bg-white/70 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl p-4 items-start`,
          iconWrapper: `bg-${c.base}-100 text-${c.base}-600 rounded-xl p-2 mr-3 shadow-sm`,
          content: `text-slate-800 font-medium text-sm`,
          progress: `bg-${c.base}-500 opacity-30`
        };
      case 'Pill':
        return {
          wrapper: `bg-white rounded-full px-6 py-3 shadow-xl border border-slate-100 items-center`,
          iconWrapper: `bg-${c.base}-500 text-white rounded-full p-1 mr-3`,
          content: `text-slate-700 font-bold text-sm`,
          progress: `hidden` // Pills usually don't have progress bars
        };
      case 'Retro':
        return {
          wrapper: `bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 items-start`,
          iconWrapper: `bg-${c.base}-200 text-black border border-black p-1 mr-3`,
          content: `text-black font-mono text-sm font-bold`,
          progress: `bg-black opacity-20`
        };
      case 'Dark':
        return {
          wrapper: `bg-slate-900 border border-slate-700 shadow-2xl rounded-lg p-4 items-start`,
          iconWrapper: `bg-${c.base}-900 text-${c.base}-400 rounded-full p-2 mr-3 ring-1 ring-${c.base}-500/50`,
          content: `text-slate-200 font-medium text-sm`,
          closeBtn: `text-slate-500 hover:text-slate-300`,
          progress: `bg-${c.base}-500 opacity-40`
        };
      case 'Gradient':
        return {
          wrapper: `bg-gradient-to-r from-${c.base}-500 to-${c.base}-600 text-white rounded-xl shadow-lg p-4 items-center`,
          iconWrapper: `bg-white/20 p-2 rounded-lg mr-3`,
          content: `text-white font-bold text-sm`,
          closeBtn: `text-white/80 hover:text-white`,
          progress: `bg-white opacity-40`
        };
      case 'Outline':
        return {
          wrapper: `bg-white border-2 border-${c.base}-500 rounded-lg p-4 shadow-none items-start`,
          iconWrapper: `text-${c.base}-600 mr-3`,
          content: `text-${c.base}-700 font-bold text-sm`,
          progress: `bg-${c.base}-500 opacity-20`
        };
      case 'Float':
        return {
          wrapper: `bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border-t-4 border-${c.base}-500 p-5 items-start translate-y-2`,
          iconWrapper: `text-${c.base}-500 bg-${c.base}-50 p-2 rounded-full mr-3`,
          content: `text-slate-600 font-medium text-sm`,
          progress: `bg-${c.base}-200 opacity-50`
        };
      case 'Modern':
      default:
        return {
          wrapper: `bg-white rounded-xl border-l-4 border-${c.base}-500 shadow-xl p-4 items-start`,
          iconWrapper: `bg-${c.base}-50 text-${c.base}-500 rounded-full p-2.5 mr-4`,
          content: `text-slate-600 font-medium text-sm`,
          progress: `bg-${c.base}-500 opacity-40`
        };
    }
  };

  const style = getStyleConfig();
  const colors = {
      success: { base: 'emerald' },
      error: { base: 'rose' },
      info: { base: 'indigo' }
  }[type];

  // Helper for icons based on type
  const Icon = () => {
      if (type === 'success') return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
      if (type === 'error') return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>;
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
  };

  return (
    <div key={message} className="fixed top-6 right-6 z-[100] flex flex-col items-end pointer-events-none filter">
      <style>
        {`
          @keyframes slideIn {
            0% { transform: translateX(120%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(120%); opacity: 0; }
          }
          @keyframes progress {
            from { width: 100%; }
            to { width: 0%; }
          }
          .toast-in { animation: slideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
          .toast-out { animation: slideOut 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        `}
      </style>
      
      <div 
        className={`
          pointer-events-auto
          relative w-full max-w-sm flex overflow-hidden
          ${isExiting ? 'toast-out' : 'toast-in'}
          ${style.wrapper}
        `}
        role="alert"
      >
        {/* Icon Area */}
        <div className={`shrink-0 flex items-center justify-center ${style.iconWrapper}`}>
           <Icon />
        </div>
        
        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <p className={`${style.content} leading-snug break-words`}>
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className={`shrink-0 p-1 -mr-1 -mt-1 rounded-lg transition-all ml-2 ${style.closeBtn || 'text-slate-400 hover:text-slate-600 hover:bg-black/5'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        {/* Progress Bar (Conditional) */}
        {style.progress !== 'hidden' && (
            <div className="absolute bottom-0 left-0 w-full h-1">
            <div 
                className={`h-full ${style.progress}`}
                style={{ 
                animation: isExiting ? 'none' : 'progress 4s linear forwards' 
                }}
            ></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default NotificationToast;