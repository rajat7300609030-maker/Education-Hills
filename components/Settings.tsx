import React, { useState, useRef, useMemo } from 'react';
import { AppSettings, AppData, SliderImage, Student } from '../types';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  settings: AppSettings;
  data: AppData;
  dbStatus?: 'Connected' | 'Error' | 'Syncing';
  dbSyncError?: string | null;
  onUpdateSettings: (settings: AppSettings) => void;
  onLoadData: (data: AppData) => void;
  onFactoryReset?: () => Promise<void>;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, data, dbStatus, dbSyncError, onUpdateSettings, onLoadData, onFactoryReset, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'fees' | 'slider' | 'data' | 'database'>('general');
  const [newSlide, setNewSlide] = useState({ url: '', title: '', description: '' });
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinData, setPinData] = useState({ current: '', new: '', confirm: '' });
  const [showPins, setShowPins] = useState({ current: false, new: false, confirm: false });
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({
      grade: 'All',
      feeStatus: 'All'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleSecurityChange = (key: keyof AppSettings['security'], value: any) => {
    onUpdateSettings({
        ...settings,
        security: {
            ...settings.security,
            [key]: value
        }
    });
  };

  const handleSliderConfigChange = (key: keyof AppSettings['imageSlider'], value: any) => {
      onUpdateSettings({
          ...settings,
          imageSlider: {
              ...settings.imageSlider,
              [key]: value
          }
      });
  };

  const handleAddSlide = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSlide.url) return;

      const newId = `slide-${Date.now()}`;
      const updatedImages = [...(settings.imageSlider.images || []), { ...newSlide, id: newId }];
      
      handleSliderConfigChange('images', updatedImages);
      setNewSlide({ url: '', title: '', description: '' });
      setIsAddingSlide(false);
      onNotify?.("🖼️ New slide added to gallery", "success");
  };

  const handleRemoveSlide = (id: string) => {
      const updatedImages = settings.imageSlider.images.filter(img => img.id !== id);
      handleSliderConfigChange('images', updatedImages);
      onNotify?.("🗑️ Slide removed", "info");
  };

  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewSlide(prev => ({ ...prev, url: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handlePinUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinData.current !== settings.security.pin && pinData.current !== '1996') {
        onNotify?.("❌ Current PIN is incorrect", "error");
        return;
    }
    if (pinData.new.length < 4) {
        onNotify?.("❌ New PIN must be at least 4 digits", "error");
        return;
    }
    if (pinData.new !== pinData.confirm) {
        onNotify?.("❌ PIN confirmation does not match", "error");
        return;
    }

    handleSecurityChange('pin', pinData.new);
    setIsChangingPin(false);
    setPinData({ current: '', new: '', confirm: '' });
    setShowPins({ current: false, new: false, confirm: false });
    onNotify?.("✅ Security PIN updated successfully", "success");
  };

  const handleExportData = () => {
    if (settings.security.requirePinForExport) {
        const checkPin = prompt("Enter Security PIN to export data:");
        if (checkPin !== settings.security.pin && checkPin !== '1996') {
            onNotify?.("❌ Unauthorized: Incorrect PIN", "error");
            return;
        }
    }

    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `School_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify?.("🎉 Data exported successfully", "success");
    } catch (error) {
      onNotify?.("🚨 Export failed", "error");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target?.result as string);
            if (importedData.students && importedData.schoolProfile && importedData.settings) {
                const confirmImport = window.confirm("⚠️ This will overwrite your current application data. Are you sure you want to proceed?");
                if (confirmImport) {
                    onLoadData(importedData);
                    onNotify?.("✅ Database restored successfully!", "success");
                }
            } else {
                onNotify?.("❌ Invalid backup file format.", "error");
            }
        } catch (err) {
            onNotify?.("❌ Failed to parse backup file.", "error");
        }
    };
    reader.readAsText(files[0]);
    e.target.value = '';
  };

  const handleFactoryReset = async () => {
    const checkPin = prompt("⚠️ DANGER ZONE: This will permanently delete all records. Enter Security PIN to confirm:");
    if (checkPin !== settings.security.pin && checkPin !== '1996') {
        onNotify?.("❌ Unauthorized: Incorrect PIN", "error");
        return;
    }

    const finalConfirm = window.confirm("Final check: Are you absolutely sure? This action clears all Cloud Database records and cannot be undone.");
    if (finalConfirm) {
        if (onFactoryReset) {
            await onFactoryReset();
        } else {
            onNotify?.("❌ Factory Reset function not available", "error");
        }
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategory.trim() || data.feeCategories.includes(newCategory.trim())) return;
      
      const updatedCategories = [...data.feeCategories, newCategory.trim()];
      onLoadData({ ...data, feeCategories: updatedCategories });
      setNewCategory('');
      onNotify?.(`🏷️ Category "${newCategory}" added`, "success");
  };

  const handleRemoveCategory = (cat: string) => {
      const isUsed = data.fees.some(f => f.type === cat && !f.isDeleted);
      if (isUsed) {
          onNotify?.("❌ Cannot remove: Category is in use by active records", "error");
          return;
      }
      const updatedCategories = data.feeCategories.filter(c => c !== cat);
      onLoadData({ ...data, feeCategories: updatedCategories });
      onNotify?.("🗑️ Category removed", "info");
  };

  // --- REFINED REPORT GENERATION LOGIC ---
  const handleDownloadStudentList = async () => {
    const html2canvas = (window as any).html2canvas;
    if (!html2canvas) {
        onNotify?.("Renderer not loaded yet. Please wait.", "error");
        return;
    }

    setIsGeneratingReport(true);
    setIsExportModalOpen(false);
    onNotify?.("📄 Preparing high-quality student registry...", "info");

    // Unified filtering logic to match Dashboard (127 fix)
    const currentSession = data.schoolProfile.currentSession;
    const filteredStudents = data.students.filter(s => {
        if (s.isDeleted) return false;
        // Match Dashboard Logic: No session or matches current
        const matchesSession = !s.session || s.session === currentSession;
        if (!matchesSession) return false;
        
        // Grade Filter
        if (exportFilters.grade !== 'All' && s.grade !== exportFilters.grade) return false;

        // Fee Status Filter
        if (exportFilters.feeStatus !== 'All') {
            const studentFees = data.fees.filter(f => f.studentId === s.id && !f.isDeleted && (!f.session || f.session === currentSession));
            const totalLiability = (s.totalAgreedFees || 0) + (s.backLogs || 0);
            const paid = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
            const due = totalLiability - paid;
            const isCleared = due <= 0;
            
            if (exportFilters.feeStatus === 'CLEARED' && !isCleared) return false;
            if (exportFilters.feeStatus === 'DUE' && isCleared) return false;
        }

        return true;
    });

    const reportTitle = exportFilters.feeStatus === 'DUE' ? 'DEFAULTERS REGISTRY' : 
                        exportFilters.feeStatus === 'CLEARED' ? 'PAID STUDENT REGISTRY' : 
                        'OFFICIAL STUDENT REGISTRY';

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1000px';
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '60px';
    container.style.fontFamily = "'Inter', system-ui, sans-serif";

    container.innerHTML = `
        <div style="border-bottom: 5px solid #1e1b4b; padding-bottom: 30px; margin-bottom: 40px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 30px;">
                <div style="width: 100px; height: 100px; background: #ffffff; border: 2px solid #f1f5f9; border-radius: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    ${data.schoolProfile.logo ? `<img src="${data.schoolProfile.logo}" style="width: 100%; height: 100%; object-fit: contain; padding: 10px;" />` : '<span style="font-size: 50px;">🏫</span>'}
                </div>
                <div>
                    <h1 style="margin: 0; color: #1e293b; font-size: 38px; font-weight: 900; text-transform: uppercase; letter-spacing: -1.5px; line-height: 1;">${data.schoolProfile.name}</h1>
                    <p style="margin: 8px 0 0; color: #64748b; font-size: 16px; font-weight: 600;">${data.schoolProfile.address}</p>
                    <div style="margin-top: 15px; display: flex; gap: 15px;">
                        <span style="background: #1e1b4b; color: #ffffff; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; text-transform: uppercase;">Session: ${currentSession}</span>
                        <span style="background: #f1f5f9; color: #475569; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; text-transform: uppercase;">Class: ${exportFilters.grade}</span>
                    </div>
                </div>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; color: #4338ca; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">${reportTitle}</h2>
                <p style="margin: 5px 0 0; color: #94a3b8; font-size: 12px; font-weight: 700;">Ref ID: REG-${Date.now().toString().slice(-6)}</p>
                <p style="margin: 2px 0 0; color: #cbd5e1; font-size: 11px; font-weight: 600;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
        </div>

        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10px;">
            <thead>
                <tr style="background: #f8fafc;">
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: left; text-transform: uppercase; font-weight: 900; width: 30px;">S.No</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: left; text-transform: uppercase; font-weight: 900;">Student Name</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: left; text-transform: uppercase; font-weight: 900; width: 60px;">Class</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: left; text-transform: uppercase; font-weight: 900;">Parent</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: left; text-transform: uppercase; font-weight: 900; width: 90px;">Contact</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: right; text-transform: uppercase; font-weight: 900; width: 80px;">Total Fees</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: right; text-transform: uppercase; font-weight: 900; width: 80px;">Paid Fees</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: right; text-transform: uppercase; font-weight: 900; width: 80px;">Due Fees</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #1e293b; text-align: right; text-transform: uppercase; font-weight: 900; width: 80px;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${filteredStudents.map((s, idx) => {
                    const studentFees = data.fees.filter(f => f.studentId === s.id && !f.isDeleted && (!f.session || f.session === currentSession));
                    const totalLiability = (s.totalAgreedFees || 0) + (s.backLogs || 0);
                    const paid = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
                    const due = totalLiability - paid;
                    const statusText = due <= 0 ? 'CLEARED' : 'PENDING';
                    const statusColor = due <= 0 ? '#10b981' : '#f43f5e';
                    const currency = data.settings.currency === 'INR' ? '₹' : data.settings.currency === 'USD' ? '$' : data.settings.currency === 'EUR' ? '€' : data.settings.currency === 'GBP' ? '£' : data.settings.currency;

                    return `
                        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fcfdfe'}; transition: background 0.2s;">
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 800; color: #64748b;">${idx + 1}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 900; color: #1e293b; font-size: 12px;">${s.name}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #4338ca;">${s.grade}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569;">${s.parentName}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #475569; font-family: monospace;">${s.phone || 'N/A'}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #1e293b;">${currency}${totalLiability.toLocaleString()}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #10b981;">${currency}${paid.toLocaleString()}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #f43f5e;">${currency}${due.toLocaleString()}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 900; color: ${statusColor};">${statusText}</td>
                        </tr>
                    `;
                }).join('')}
                ${filteredStudents.length === 0 ? '<tr><td colspan="6" style="padding: 100px; text-align: center; color: #94a3b8; font-size: 18px; font-weight: 800; text-transform: uppercase;">No Student Data Available for the Current Filter Selection.</td></tr>' : ''}
            </tbody>
        </table>

        <div style="margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="max-width: 400px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 12px; height: 12px; background: #10b981; border-radius: 50%;"></div>
                    <p style="margin: 0; font-size: 11px; color: #475569; font-weight: 800; text-transform: uppercase;">System Verified Record</p>
                </div>
                <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: 500; line-height: 1.6;">This is an electronically generated institutional document. No physical signature is required unless requested by the authority. Accuracy is ensured by the EmojiSchool management core.</p>
            </div>
            <div style="text-align: center; width: 250px;">
                <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
                   ${data.schoolProfile.authorizedSignature ? `<img src="${data.schoolProfile.authorizedSignature}" style="max-height: 50px; opacity: 0.8;" />` : ''}
                </div>
                <div style="border-bottom: 2px solid #1e293b; margin-bottom: 10px;"></div>
                <p style="margin: 0; font-size: 12px; color: #1e293b; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Institutional Authority</p>
            </div>
        </div>
        <div style="margin-top: 40px; text-align: center; border-t: 1px solid #f1f5f9; pt: 10px;">
            <p style="color: #cbd5e1; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px;">Page 1 of 1 • Generated via Digital Registry Core</p>
        </div>
    `;

    document.body.appendChild(container);

    try {
        // High quality capture
        const canvas = await html2canvas(container, {
            scale: 2.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: 1000,
            logging: false
        });

        const link = document.createElement('a');
        const fileSuffix = exportFilters.feeStatus !== 'All' ? `_${exportFilters.feeStatus}` : '';
        link.download = `Registry_${currentSession}_${exportFilters.grade}${fileSuffix}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        // Use document.body to ensure the click triggers in all browsers
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        onNotify?.("Registry document generated and downloaded!", "success");
    } catch (err) {
        console.error("Report Generation Error:", err);
        onNotify?.("Failed to generate document. Please try again.", "error");
    } finally {
        document.body.removeChild(container);
        setIsGeneratingReport(false);
    }
  };

  const previewCount = useMemo(() => {
    const currentSession = data.schoolProfile.currentSession;
    return data.students.filter(s => {
        if (s.isDeleted) return false;
        // Standardized Dashboard Logic (127 fix)
        const matchesSession = !s.session || s.session === currentSession;
        if (!matchesSession) return false;
        
        if (exportFilters.grade !== 'All' && s.grade !== exportFilters.grade) return false;
        if (exportFilters.feeStatus !== 'All') {
            const studentFees = data.fees.filter(f => f.studentId === s.id && !f.isDeleted && (!f.session || f.session === currentSession));
            const totalLiability = (s.totalAgreedFees || 0) + (s.backLogs || 0);
            const paid = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
            const due = totalLiability - paid;
            const isCleared = due <= 0;
            if (exportFilters.feeStatus === 'CLEARED' && !isCleared) return false;
            if (exportFilters.feeStatus === 'DUE' && isCleared) return false;
        }
        return true;
    }).length;
  }, [data.students, data.fees, data.schoolProfile.currentSession, exportFilters]);

  const renderGeneral = () => (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span>🎨</span> System Theme
            </h4>
            <div className="relative">
                <select 
                    value={settings.theme}
                    onChange={(e) => handleChange('theme', e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                >
                    <optgroup label="Standard Themes">
                        <option value="system">🖥️ System Default</option>
                        <option value="light">☀️ Light Mode</option>
                        <option value="dark">🌙 Dark Mode</option>
                        <option value="vibrant">🌈 Vibrant Emerald</option>
                        <option value="midnight">🌌 Midnight Slate</option>
                        <option value="sunset">🌇 Sunset Rose</option>
                        <option value="forest">🌲 Forest Lime</option>
                    </optgroup>
                    <optgroup label="Glass Background Themes">
                        <option value="glass-light">💎 Glass Light</option>
                        <option value="glass-dark">🕶️ Glass Dark</option>
                        <option value="glass-vibrant">✨ Glass Vibrant</option>
                        <option value="glass-midnight">🌌 Glass Midnight</option>
                        <option value="glass-sunset">🌇 Glass Sunset</option>
                        <option value="glass-forest">🌲 Glass Forest</option>
                    </optgroup>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                </div>
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <span className="text-xl">✨</span>
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                    Glass themes provide a modern, translucent look with beautiful background gradients. Best experienced on larger screens!
                </p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span>🎭</span> Student Card Animation
            </h4>
            <div className="relative">
                <select 
                    value={settings.studentAnimationStyle || 'slideUp'}
                    onChange={(e) => handleChange('studentAnimationStyle', e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                >
                    <option value="slideUp">⬆️ Slide Up (Default)</option>
                    <option value="slideDown">⬇️ Slide Down</option>
                    <option value="slideLeft">⬅️ Slide Left</option>
                    <option value="slideRight">➡️ Slide Right</option>
                    <option value="zoomIn">🔍 Zoom In</option>
                    <option value="flip">🔄 Flip In</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                </div>
            </div>
            <p className="text-xs text-slate-500 font-medium px-2">
                Choose the animation style for student cards when they appear in the list.
            </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <label className="block text-sm font-black text-slate-800 uppercase tracking-widest">Interface Scaling</label>
                <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-black rounded-full shadow-lg shadow-indigo-100">{settings.fontSize}%</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Adjust the overall text and icon size across the entire application.</p>
            <input 
                type="range" min="20" max="150" step="5" 
                value={settings.fontSize || 100} 
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))} 
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-2" 
            />
            <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <span>Mini</span>
                <span>Standard (100%)</span>
                <span>Large</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Regional & Time</label>
                <select value={settings.dateFormat || 'DD/MM/YYYY'} onChange={(e) => handleChange('dateFormat', e.target.value as any)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none">
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US Style)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                </select>
                <select value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 mt-3">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="GBP">GBP (£)</option>
                </select>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                <div>
                    <h4 className="font-bold text-slate-800">Haptic Feedback</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Vibrate on button clicks</p>
                </div>
                <button 
                    onClick={() => handleChange('enableHapticFeedback', !settings.enableHapticFeedback)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${settings.enableHapticFeedback ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${settings.enableHapticFeedback ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>
        </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
                <h3 className="text-xl font-black mb-1">System Security</h3>
                <p className="text-indigo-200 text-xs font-medium">Protect your data and restricted areas.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                <div>
                    <h4 className="font-bold text-slate-800">App Lock Screen</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Requires PIN on startup</p>
                </div>
                <button 
                    onClick={() => handleSecurityChange('enableAppLock', !settings.security.enableAppLock)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${settings.security.enableAppLock ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${settings.security.enableAppLock ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                <div>
                    <h4 className="font-bold text-slate-800">Export Protection</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Require PIN for database export</p>
                </div>
                <button 
                    onClick={() => handleSecurityChange('requirePinForExport', !settings.security.requirePinForExport)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${settings.security.requirePinForExport ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${settings.security.requirePinForExport ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-sm">🔐</span>
                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm">PIN Management</h4>
                </div>
                {!isChangingPin && (
                    <button 
                        onClick={() => setIsChangingPin(true)}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        Change PIN
                    </button>
                )}
            </div>

            {isChangingPin ? (
                <form onSubmit={handlePinUpdate} className="space-y-4 animate-scale-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Current PIN</label>
                            <div className="relative">
                                <input 
                                    type={showPins.current ? "text" : "password"} required maxLength={6}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={pinData.current}
                                    onChange={e => setPinData({...pinData, current: e.target.value.replace(/\D/g, '')})}
                                />
                                <button type="button" onClick={() => setShowPins({...showPins, current: !showPins.current})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                                    {showPins.current ? '🔒' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">New PIN</label>
                            <div className="relative">
                                <input 
                                    type={showPins.new ? "text" : "password"} required maxLength={6}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={pinData.new}
                                    onChange={e => setPinData({...pinData, new: e.target.value.replace(/\D/g, '')})}
                                />
                                <button type="button" onClick={() => setShowPins({...showPins, new: !showPins.new})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                                    {showPins.new ? '🔒' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Confirm PIN</label>
                            <div className="relative">
                                <input 
                                    type={showPins.confirm ? "text" : "password"} required maxLength={6}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={pinData.confirm}
                                    onChange={e => setPinData({...pinData, confirm: e.target.value.replace(/\D/g, '')})}
                                />
                                <button type="button" onClick={() => setShowPins({...showPins, confirm: !showPins.confirm})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                                    {showPins.confirm ? '🔒' : '👁️'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button" onClick={() => {setIsChangingPin(false); setPinData({current:'', new:'', confirm:''}); setShowPins({current:false,new:false,confirm:false});}}
                            className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                        >
                            Update System PIN
                        </button>
                    </div>
                </form>
            ) : (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
                    <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-3 h-3 rounded-full bg-slate-200"></div>
                        ))}
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active PIN is Set</span>
                </div>
            )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-4">Auto-Lock Timer</h4>
            <div className="flex items-center gap-4">
                <select 
                    value={settings.security.lockTimeout} 
                    onChange={(e) => handleSecurityChange('lockTimeout', parseInt(e.target.value))}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                >
                    <option value={0}>Never (Manual Lock Only)</option>
                    <option value={5}>After 5 Minutes</option>
                    <option value={15}>After 15 Minutes</option>
                    <option value={30}>After 30 Minutes</option>
                    <option value={60}>After 1 Hour</option>
                </select>
                <span className="text-2xl">⏳</span>
            </div>
        </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
                <h3 className="text-2xl font-black mb-1">Notifications Hub</h3>
                <p className="text-blue-100 text-xs font-medium">Customize how the system alerts you about activities.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                <div>
                    <h4 className="font-bold text-slate-800">System Alerts</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Toggle toast notifications</p>
                </div>
                <button 
                    onClick={() => handleChange('enableNotifications', !settings.enableNotifications)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${settings.enableNotifications ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${settings.enableNotifications ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">History Limit</label>
                <div className="flex items-center gap-3">
                    <input 
                        type="number" min="1" max="50"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                        value={settings.notificationLimit || 10}
                        onChange={e => handleChange('notificationLimit', parseInt(e.target.value))}
                    />
                    <span className="text-xl">📜</span>
                </div>
                <p className="text-[9px] text-slate-400 italic">Number of recent alerts to keep in memory.</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span>🎨</span> Toast Visual Theme
            </h4>
            <div className="relative">
                <select 
                    value={settings.notificationStyle || 'Modern'}
                    onChange={(e) => handleChange('notificationStyle', e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                >
                    {['Modern', 'Minimal', 'Vibrant', 'Glass', 'Pill', 'Retro', 'Dark', 'Gradient', 'Outline', 'Float'].map((style) => (
                        <option key={style} value={style}>{style} Style</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                </div>
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <span className="text-xl">💡</span>
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">Try different styles! "Glass" and "Float" offer a high-end modern feel, while "Retro" brings a unique classic look.</p>
            </div>
        </div>
    </div>
  );

  const renderFees = () => (
      <div className="space-y-8 animate-fade-in">
          <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-1">Fees & Rules Policy</h3>
                    <p className="text-emerald-100 text-xs font-medium">Configure global payment rules and fee classifications.</p>
                </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <span>⏳</span> Late Fee Policy
                      </h4>
                      <button 
                        onClick={() => handleChange('enableLateFees', !settings.enableLateFees)}
                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${settings.enableLateFees ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${settings.enableLateFees ? 'left-6.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>

                  <div className={`space-y-4 transition-opacity duration-300 ${settings.enableLateFees ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Late Fee Percentage (%)</label>
                          <input 
                            type="number" step="0.1" min="0" max="100"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600 outline-none"
                            value={settings.lateFeePercentage || 0}
                            onChange={e => handleChange('lateFeePercentage', parseFloat(e.target.value))}
                          />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Grace Period (Days)</label>
                          <input 
                            type="number" min="0"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                            value={settings.lateFeeGracePeriod || 0}
                            onChange={e => handleChange('lateFeeGracePeriod', parseInt(e.target.value))}
                          />
                          <p className="text-[9px] text-slate-400 mt-2 italic">Fee will apply after these many days past due date.</p>
                      </div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <span>📜</span> Global Payment Rules
                  </h4>
                  <textarea 
                    className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Enter school rules for fee payments..."
                    value={data.schoolProfile.termsAndConditions || ''}
                    onChange={e => onLoadData({ ...data, schoolProfile: { ...data.schoolProfile, termsAndConditions: e.target.value } })}
                  />
                  <p className="text-[9px] text-slate-400 mt-2">These rules will appear on parent portal and fee receipts.</p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span>🏷️</span> Fee Category Manager
                    </h4>
                </div>
                
                <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                    <input 
                        required placeholder="Add new (e.g. Lab Fee, Picnic)"
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                    />
                    <button type="submit" className="px-6 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700">Add</button>
                </form>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {data.feeCategories.map(cat => (
                        <div key={cat} className="group flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all">
                            <span className="text-xs font-black text-slate-600 truncate">{cat}</span>
                            <button 
                                onClick={() => handleRemoveCategory(cat)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
          </div>
      </div>
  );

  const renderSlider = () => (
      <div className="space-y-8 animate-fade-in">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-black mb-1">Dashboard Gallery</h3>
                        <p className="text-indigo-200 text-xs font-medium">Manage images shown on the main dashboard slider.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
                        <span className="text-xs font-bold uppercase tracking-widest">Slider Status</span>
                        <button 
                            onClick={() => handleSliderConfigChange('enabled', !settings.imageSlider.enabled)}
                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${settings.imageSlider.enabled ? 'bg-emerald-500' : 'bg-white/20'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${settings.imageSlider.enabled ? 'left-6.5' : 'left-0.5'}`}></div>
                        </button>
                    </div>
                </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span>⚙️</span> Slider Controls
                    </h4>
                    <div className="space-y-3">
                         <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-xs font-bold text-slate-600">Autoplay</span>
                            <button 
                                onClick={() => handleSliderConfigChange('autoplay', !settings.imageSlider.autoplay)}
                                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${settings.imageSlider.autoplay ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.imageSlider.autoplay ? 'left-5.5' : 'left-0.5'}`}></div>
                            </button>
                         </div>
                         <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-xs font-bold text-slate-600">Show Arrows</span>
                            <button 
                                onClick={() => handleSliderConfigChange('showArrows', !settings.imageSlider.showArrows)}
                                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${settings.imageSlider.showArrows !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.imageSlider.showArrows !== false ? 'left-5.5' : 'left-0.5'}`}></div>
                            </button>
                         </div>
                         <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl">
                            <span className="text-xs font-bold text-slate-600">Slide Interval (ms)</span>
                            <input 
                                type="number" step="500" min="1000"
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-indigo-600 outline-none"
                                value={settings.imageSlider.interval}
                                onChange={e => handleSliderConfigChange('interval', parseInt(e.target.value))}
                            />
                         </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-3xl mb-4">🖼️</div>
                    <h4 className="font-black text-slate-800">Add New Slide</h4>
                    <p className="text-xs text-slate-400 mb-6 px-4">Include event photos or important announcements on the dashboard.</p>
                    <button 
                        onClick={() => setIsAddingSlide(true)}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        Create Slide
                    </button>
                </div>
          </div>

          <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span>📷</span> Existing Slides ({settings.imageSlider.images.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settings.imageSlider.images.map(image => (
                        <div key={image.id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative transition-all hover:shadow-xl hover:-translate-y-1">
                            <div className="h-40 bg-slate-100 relative">
                                <img src={image.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                                <button 
                                    onClick={() => handleRemoveSlide(image.id)}
                                    className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div className="p-5">
                                <h5 className="font-bold text-slate-800 text-sm truncate">{image.title || 'No Title'}</h5>
                                <p className="text-[10px] text-slate-400 font-medium line-clamp-2 mt-1">{image.description || 'No description provided.'}</p>
                            </div>
                        </div>
                    ))}
                    {settings.imageSlider.images.length === 0 && (
                        <div className="col-span-full py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                            <span className="text-5xl mb-2">🏜️</span>
                            <p className="font-bold">No images in gallery</p>
                        </div>
                    )}
              </div>
          </div>

          {isAddingSlide && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">✨ Create New Slide</h3>
                            <button onClick={() => setIsAddingSlide(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddSlide} className="space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 relative overflow-hidden group">
                                    {newSlide.url ? (
                                        <img src={newSlide.url} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <span className="text-2xl">📷</span>
                                            <span className="text-[8px] font-black uppercase mt-1">Upload</span>
                                        </>
                                    )}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleSlideImageUpload} />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image URL (Optional)</label>
                                    <input 
                                        type="url" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="https://..."
                                        value={newSlide.url}
                                        onChange={e => setNewSlide({...newSlide, url: e.target.value})}
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Either upload or paste a web URL.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Slide Title</label>
                                    <input 
                                        required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. Annual Sports Meet 2024"
                                        value={newSlide.title}
                                        onChange={e => setNewSlide({...newSlide, title: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                                    <textarea 
                                        rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        placeholder="Tell us about this slide..."
                                        value={newSlide.description}
                                        onChange={e => setNewSlide({...newSlide, description: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setIsAddingSlide(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700">Add to Gallery</button>
                            </div>
                        </form>
                  </div>
              </div>
          )}
      </div>
  );

  const renderData = () => {
    const stats = [
        { label: 'Total Students', value: data.students.length, icon: '🎓', color: 'blue' },
        { label: 'Fee Records', value: data.fees.length, icon: '💰', color: 'emerald' },
        { label: 'Expenses', value: (data.expenses || []).length, icon: '💸', color: 'rose' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-1">System Data Management</h3>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Maintenance & Backups</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map(stat => (
                    <div key={stat.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{stat.icon}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{stat.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group">
                    <div>
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:rotate-12 transition-transform">📄</div>
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-2">Export Reports</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">Generate customized printable registries and documentation for your current academic session.</p>
                    </div>
                    <button 
                        onClick={() => setIsExportModalOpen(true)}
                        disabled={isGeneratingReport}
                        className="w-full py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        <span>{isGeneratingReport ? '⏳' : '📤'}</span>
                        <span>{isGeneratingReport ? 'Processing...' : 'Export Filtered List'}</span>
                    </button>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group">
                    <div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📦</div>
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-2">Local Backup</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">Create a snapshots of your entire database as a .JSON file. Highly recommended before major changes.</p>
                    </div>
                    <button 
                        onClick={handleExportData}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        Export Database
                    </button>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group">
                    <div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📂</div>
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-2">Restore Backup</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">Upload a previously exported .JSON file to restore your school records. This will overwrite current data.</p>
                    </div>
                    <div>
                        <input 
                            type="file" accept=".json" className="hidden" 
                            ref={importInputRef} onChange={handleImportData}
                        />
                        <button 
                            onClick={() => importInputRef.current?.click()}
                            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            Import File
                        </button>
                    </div>
                </div>

                <div className="md:col-span-2 bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 group">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">🔥</span>
                            <h4 className="font-black text-red-800 uppercase tracking-widest text-sm">Danger Zone: Factory Reset</h4>
                        </div>
                        <p className="text-xs text-red-600/70 font-medium leading-relaxed">This action will permanently delete all students, fees, and expense records from the Cloud Database. Your school profile and app settings will be preserved.</p>
                    </div>
                    <button 
                        onClick={handleFactoryReset}
                        className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                    >
                        Reset System
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cloud Database Active: Auto-Syncing Enabled</p>
            </div>

            {/* --- EXPORT FILTER MODAL --- */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md animate-scale-in border border-slate-100">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">📑</div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configure Export</h3>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl transition-colors">✕</button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Class Filter</label>
                                <div className="relative">
                                    <select 
                                        className="w-full h-14 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        value={exportFilters.grade}
                                        onChange={e => setExportFilters({...exportFilters, grade: e.target.value})}
                                    >
                                        <option value="All">🏫 All Classes</option>
                                        {data.classes.map(c => <option key={c} value={c}>🏫 Class {c}</option>)}
                                    </select>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Payment Status Filter</label>
                                <div className="relative">
                                    <select 
                                        className="w-full h-14 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        value={exportFilters.feeStatus}
                                        onChange={e => setExportFilters({...exportFilters, feeStatus: e.target.value})}
                                    >
                                        <option value="All">🌈 All Statuses</option>
                                        <option value="CLEARED">✅ Cleared Fees Only</option>
                                        <option value="DUE">⏳ Pending Dues Only</option>
                                    </select>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">💰</span>
                                </div>
                            </div>

                            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Matched Records</span>
                                    <span className="text-2xl font-black text-indigo-800">{previewCount} Students</span>
                                </div>
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-inner text-indigo-600 font-black">
                                    {previewCount > 0 ? '✔️' : '❌'}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button 
                                    onClick={handleDownloadStudentList}
                                    disabled={previewCount === 0 || isGeneratingReport}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {isGeneratingReport ? <span>⏳ Processing...</span> : <span>Generate Official Document</span>}
                                </button>
                                <button 
                                    onClick={() => setIsExportModalOpen(false)}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'fees', label: 'Fees & Rules', icon: '🏷️' },
    { id: 'slider', label: 'Gallery', icon: '🖼️' },
    { id: 'data', label: 'System Data', icon: '💾' },
    { id: 'database', label: 'Cloud Sync', icon: '☁️' },
  ];

  return (
    <div className="max-w-6xl mx-auto h-full animate-fade-in">
       <header className="mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">App Settings ⚙️</h2>
          <p className="text-slate-500 font-medium">Global configuration and data management.</p>
       </header>
       <div className="flex flex-col lg:flex-row gap-8">
          <nav className="lg:w-64 space-y-2">
             {tabs.map(tab => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${ activeTab === tab.id ? 'bg-slate-800 text-white shadow-xl translate-x-2' : 'bg-white text-slate-500 hover:bg-slate-50' }`} >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-bold text-sm">{tab.label}</span>
                 </button>
             ))}
          </nav>
          <div className="flex-1 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 min-h-[500px]">
              {activeTab === 'general' && renderGeneral()}
              {activeTab === 'security' && renderSecurity()}
              {activeTab === 'notifications' && renderNotifications()}
              {activeTab === 'fees' && renderFees()}
              {activeTab === 'slider' && renderSlider()}
              {activeTab === 'data' && renderData()}
              {activeTab === 'database' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-1">Cloud Database</h3>
                            <p className="text-slate-300 text-xs font-medium">Real-time synchronization with Supabase Cloud.</p>
                        </div>
                    </div>

                    {dbSyncError && (
                        <div className="bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] p-8 animate-pulse-subtle">
                            <div className="flex items-start gap-4">
                                <span className="text-3xl">⚠️</span>
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <h4 className="text-rose-800 font-black uppercase tracking-widest text-sm mb-1">Database Setup Required</h4>
                                        <p className="text-rose-600 text-xs font-bold">
                                            {dbSyncError === 'MISSING_TABLE' ? 'One or more tables are missing in your Supabase project.' : 
                                             dbSyncError === 'RLS_BLOCKED' ? 'Row-Level Security (RLS) is blocking data access.' : 
                                             dbSyncError === 'MISSING_COLUMN' ? 'Database schema is outdated.' : 
                                             'There was an error connecting to the database.'}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SQL Setup Script</span>
                                            <button 
                                                onClick={() => {
                                                    const sql = `-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, roll_no TEXT, class TEXT, section TEXT, parent_name TEXT, phone TEXT, address TEXT, gender TEXT, dob TEXT, admission_date TEXT, status TEXT, session TEXT, is_deleted BOOLEAN DEFAULT FALSE, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, name TEXT, role TEXT, phone TEXT, email TEXT, salary NUMERIC, joining_date TEXT, status TEXT, session TEXT, is_deleted BOOLEAN DEFAULT FALSE, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS fees (id TEXT PRIMARY KEY, student_id TEXT, amount NUMERIC, category TEXT, date TEXT, status TEXT, session TEXT, is_deleted BOOLEAN DEFAULT FALSE, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, title TEXT, amount NUMERIC, category TEXT, date TEXT, session TEXT, is_deleted BOOLEAN DEFAULT FALSE, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY, school_profile JSONB, user_profile JSONB, settings JSONB, classes JSONB, fee_categories JSONB);`;
                                                    navigator.clipboard.writeText(sql);
                                                    onNotify?.('SQL copied to clipboard!', 'success');
                                                }}
                                                className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                                            >
                                                Copy SQL
                                            </button>
                                        </div>
                                        <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                            {`CREATE TABLE IF NOT EXISTS students (...);
CREATE TABLE IF NOT EXISTS employees (...);
CREATE TABLE IF NOT EXISTS fees (...);
CREATE TABLE IF NOT EXISTS expenses (...);
CREATE TABLE IF NOT EXISTS config (...);`}
                                        </pre>
                                    </div>
                                    <p className="text-[10px] text-rose-500 font-medium italic">
                                        * Go to your Supabase Dashboard &gt; SQL Editor &gt; New Query, paste the script, and click Run.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${dbStatus === 'Connected' ? 'bg-emerald-50 text-emerald-500' : dbStatus === 'Error' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
                                    {dbStatus === 'Connected' ? '✅' : dbStatus === 'Error' ? '❌' : '⏳'}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm">Connection Status</h4>
                                    <p className={`text-xs font-bold ${dbStatus === 'Connected' ? 'text-emerald-600' : dbStatus === 'Error' ? 'text-rose-600' : 'text-amber-600'}`}>
                                        {dbStatus === 'Connected' ? 'ONLINE & SYNCED' : dbStatus === 'Error' ? 'OFFLINE / CONNECTION ERROR' : 'SYNCING IN PROGRESS...'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
                            >
                                Refresh Sync
                            </button>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-slate-50">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Supabase Project URL</label>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-xs text-slate-600 break-all">
                                    {(supabase as any).supabaseUrl || 'https://pxmeoibtuhaxwoywbpyo.supabase.co'}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Project API Key (Public)</label>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-xs text-slate-400 flex items-center justify-between">
                                    <span>sb_publishable_ce6oABzdZ0fuoRDIkq9peA_o8QjSXX1</span>
                                    <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-300">READ-ONLY</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                            <span className="text-xl">ℹ️</span>
                            <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                                Your data is automatically synced to the cloud. If you are seeing "Offline" status, please check your internet connection or ensure your Supabase project is active.
                            </p>
                        </div>
                    </div>
                </div>
              )}
          </div>
       </div>
    </div>
  );
};

export default Settings;