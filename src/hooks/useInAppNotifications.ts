import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface InAppNotification {
  id: string;
  user_id: string;
  type: string;
  urgency: 'critical' | 'high' | 'normal' | 'info';
  title: string;
  body: string;
  reference_id?: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
}

const urgencyOrder = {
  critical: 1,
  high: 2,
  normal: 3,
  info: 4
};

export function useInAppNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching in-app notifications:', error);
      } else if (data) {
        const typedData = data as InAppNotification[];
        const sorted = typedData.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
        setNotifications(sorted);
      }
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel('public:in_app_notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'in_app_notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => {
            const newNotif = payload.new as InAppNotification;
            if (newNotif.dismissed) return prev;
            const updated = [newNotif, ...prev];
            return updated.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
          });
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => {
            const updatedNotif = payload.new as InAppNotification;
            if (updatedNotif.dismissed) {
              return prev.filter(n => n.id !== updatedNotif.id);
            }
            const updated = prev.map(n => n.id === updatedNotif.id ? updatedNotif : n);
            return updated.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
          });
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    // Atualiza estado otimista
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking as read:', error);
      // rollback ou fetch no erro
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('in_app_notifications')
      .update({ read: true })
      .in('id', unreadIds);
  };

  const dismiss = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase
      .from('in_app_notifications')
      .update({ dismissed: true })
      .eq('id', id);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, dismiss, loading };
}
