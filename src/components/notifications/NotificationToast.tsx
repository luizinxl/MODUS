import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';

interface ToastData {
  id: number;
  title: string;
  body: string;
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newToast: ToastData = {
        id: Date.now(),
        title: customEvent.detail.title || 'Nova Notificação',
        body: customEvent.detail.body || ''
      };
      
      setToasts(prev => [...prev, newToast]);

      // Remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('new_notification', handleNewNotification);
    return () => window.removeEventListener('new_notification', handleNewNotification);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="bg-[#12141C] border border-[#232735] shadow-2xl rounded-xl p-4 w-80 pointer-events-auto flex items-start gap-3 cursor-pointer"
            onClick={() => removeToast(toast.id)}
          >
            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-[#1C64EF]/10 flex items-center justify-center text-[#1C64EF]">
              <Bell size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
              <p className="text-xs text-[#8E95A5] mt-1 line-clamp-2">{toast.body}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
              className="text-[#636A7E] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
