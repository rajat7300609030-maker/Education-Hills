import React, { useState, useRef, useEffect } from 'react';
import { AppData, Student, FeeRecord } from '../types';
import { askSchoolAssistant } from '../services/geminiService';

interface SmartAssistantProps {
  appData: AppData;
  onAddStudent: (student: Omit<Student, 'id' | 'isDeleted'>) => void;
  onAddFee: (fee: Omit<FeeRecord, 'id' | 'isDeleted'>) => void;
}

const SmartAssistant: React.FC<SmartAssistantProps> = ({ appData, onAddStudent, onAddFee }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([
    { role: 'model', parts: [{ text: "Hello! I'm your Genkit AI Agent 🤖. I can answer questions AND update the database. Try 'Add a student named John'!" }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    const newHistory = [
      ...messages,
      { role: 'user' as const, parts: [{ text: userMsg }] }
    ];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const fullResponse = await askSchoolAssistant(userMsg, appData, messages.slice(1));
      
      // Parse for Action Block
      let displayText = fullResponse;
      const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/);
      
      if (jsonMatch) {
        try {
          const actionBlock = JSON.parse(jsonMatch[1]);
          displayText = fullResponse.replace(jsonMatch[0], ''); // Remove JSON from display

          if (actionBlock.action === 'ADD_STUDENT') {
             const sData = actionBlock.data;
             onAddStudent({
               name: sData.name || 'Unknown',
               grade: sData.grade || 'N/A',
               parentName: sData.parentName || 'N/A',
               phone: sData.phone || '',
               email: sData.email || '',
               enrollmentDate: new Date().toISOString().split('T')[0]
             });
             displayText += "\n\n✅ **Action Executed**: Student added to database.";
          }
          
          if (actionBlock.action === 'ADD_FEE') {
             const fData = actionBlock.data;
             if (fData.studentId && fData.studentId !== '...') {
                onAddFee({
                   studentId: fData.studentId,
                   amount: Number(fData.amount) || 0,
                   type: fData.type || 'Tuition',
                   status: fData.status || 'Pending',
                   date: new Date().toISOString().split('T')[0],
                   description: fData.description || 'Added via Genkit Agent'
                });
                displayText += "\n\n✅ **Action Executed**: Fee record added.";
             } else {
                displayText += "\n\n⚠️ **Action Failed**: Could not identify Student ID.";
             }
          }

        } catch (e) {
          console.error("Failed to parse Genkit Action", e);
        }
      }

      setMessages(prev => [
        ...prev,
        { role: 'model', parts: [{ text: displayText }] }
      ]);
    } catch (error) {
       setMessages(prev => [
        ...prev,
        { role: 'model', parts: [{ text: "Sorry, I had trouble thinking about that." }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold flex items-center gap-2">🤖 Genkit AI Agent</h2>
            <p className="text-xs opacity-80">Powered by Gemini</p>
         </div>
         <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
           Active
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
            }`}>
              {/* Simple Markdown rendering for bolding */}
              <p className="whitespace-pre-wrap leading-relaxed">
                {msg.parts[0].text.split('**').map((part, i) => 
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl border border-slate-200 rounded-tl-none shadow-sm flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Thinking...</span>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ask to add a student, check fees..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-bold"
          >
            Send 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartAssistant;