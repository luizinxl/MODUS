import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { Check, Trash2, Bell, AlertCircle, Info, Clock } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markAsRead, markAllAsRead, dismiss, loading } = useInAppNotifications();

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'border-l-4 border-l-[#F43F5E] bg-[#F43F5E]/5';
      case 'high': return 'border-l-4 border-l-[#F97316] bg-[#F97316]/5';
      case 'normal': return 'border-l-4 border-l-[#EAB308] bg-[#EAB308]/5';
      default: return 'border-l-4 border-l-[#1C64EF] bg-[#1C64EF]/5';
    }
  };

  const getIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertCircle size={16} className="text-[#F43F5E]" />;
      case 'high': return <Clock size={16} className="text-[#F97316]" />;
      case 'normal': return <Bell size={16} className="text-[#EAB308]" />;
      default: return <Info size={16} className="text-[#1C64EF]" />;
    }
  };

  return (
    <div className="bg-[#12141C] border border-[#232735] shadow-xl rounded-2xl overflow-hidden flex flex-col max-h-[500px]">
      <div className="p-4 border-b border-[#232735] flex items-center justify-between bg-[#1A1D27]">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Bell size={16} className="text-[#8E95A5]" /> Notificações
        </h3>
        <button 
          onClick={markAllAsRead}
          className="text-xs text-[#8E95A5] hover:text-white transition-colors flex items-center gap-1"
        >
          <Check size={14} /> Marcar todas como lidas
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
        {loading ? (
          <div className="p-4 text-center text-[#8E95A5] text-sm">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1A1D27] flex items-center justify-center text-[#8E95A5]">
              <Bell size={24} />
            </div>
            <p className="text-[#8E95A5] text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                className={clsx(
                  "p-3 rounded-xl transition-colors group relative",
                  !notif.read ? "bg-[#1A1D27]" : "bg-transparent hover:bg-[#1A1D27]/50",
                  getUrgencyStyles(notif.urgency)
                )}
                onMouseEnter={() => !notif.read && markAsRead(notif.id)}
              >
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 shrink-0">
                    {getIcon(notif.urgency)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={clsx("text-sm font-medium", !notif.read ? "text-white" : "text-[#B8BFCC]")}>
                      {notif.title}
                    </h4>
                    <p className="text-xs text-[#8E95A5] mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                    <span className="text-[10px] text-[#636A7E] mt-2 block">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#8E95A5] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
