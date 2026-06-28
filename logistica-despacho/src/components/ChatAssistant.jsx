import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChatAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy el asistente virtual de LogiDespacho. ¿En qué te puedo ayudar hoy sobre los procesos del sistema?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [botTransform, setBotTransform] = useState('translate(0px, 0px) rotate(0deg)');
  const botRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!botRef.current || isOpen) return;
      
      const rect = botRef.current.getBoundingClientRect();
      const botCenterX = rect.left + rect.width / 2;
      const botCenterY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - botCenterX;
      const deltaY = e.clientY - botCenterY;
      
      // Calcular ángulo hacia el mouse
      const angle = Math.atan2(deltaY, deltaX);
      
      // Calcular la distancia para que el efecto sea más fuerte de cerca
      const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 500);
      const intensity = distance / 500; 
      
      // Mover el robot máximo 10px en la dirección del mouse
      const moveX = Math.cos(angle) * 10 * intensity;
      const moveY = Math.sin(angle) * 10 * intensity;
      
      // Inclinar el robot un poco hacia el lado donde está el mouse
      const rotZ = Math.cos(angle) * 15 * intensity;
      
      setBotTransform(`translate(${moveX}px, ${moveY}px) rotate(${rotZ}deg) scale(1.1)`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Resetear cuando sale el mouse de la pantalla
    const handleMouseLeave = () => setBotTransform('translate(0px, 0px) rotate(0deg) scale(1)');
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages,
          userRole: user?.rol_nombre || 'Invitado',
          userName: user?.nombre_completo || 'Usuario'
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        const errorMessage = data.details ? `${data.error} (Detalles: ${data.details})` : (data.error || '');
        setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un problema. ' + errorMessage }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de red. Asegúrate de que el servidor esté funcionando.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className={`print:hidden fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }}></div>
        <button
          onClick={() => setIsOpen(true)}
          ref={botRef}
          className="relative p-3 sm:p-4 rounded-full shadow-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/50 hover:scale-110 transition-transform duration-300 flex items-center justify-center overflow-hidden group"
        >
          {/* Ojos/Cuerpo del robot que siguen al mouse */}
          <div 
            style={{ transform: botTransform, transition: 'transform 0.1s ease-out' }}
            className="flex items-center justify-center relative z-10"
          >
            <Bot size={28} className="group-hover:animate-none sm:w-[32px] sm:h-[32px]" />
          </div>
          
          {/* Reflejo brillante tipo "cristal" encima */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
        </button>
      </div>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-0 right-0 w-full h-[90vh] sm:w-[380px] sm:h-[600px] sm:bottom-6 sm:right-6 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 z-[9999] transform origin-bottom-right border border-gray-200 ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-4 flex justify-between items-center text-white shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-md leading-tight">Asistente Virtual</h3>
              <p className="text-xs text-indigo-200">En línea</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl p-3 text-gray-500 rounded-bl-none border border-gray-200 shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="text-xs">Pensando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200">
          <div className="flex items-center bg-slate-100 rounded-full pr-2 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 bg-transparent py-3 px-4 outline-none text-sm text-gray-700"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
