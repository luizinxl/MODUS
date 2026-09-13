import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { messaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

export function useNotifications() {
  const { user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const requestPermissionAndSaveToken = async () => {
    if (!user || !messaging) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });

        if (token) {
          setFcmToken(token);
          // Save to Supabase
          const { error } = await supabase
            .from('fcm_tokens')
            .upsert({ user_id: user.id, token }, { onConflict: 'token' });

          if (error) {
            console.error('Error saving FCM token:', error);
          }
        }
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
    }
  };

  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      // Exibe um toast se não for tratado pelo service worker
      // Este evento dispara com o app em foreground
      console.log('Message received. ', payload);
      const title = payload.notification?.title;
      const body = payload.notification?.body;
      
      if (title || body) {
        // Disparar evento customizado para o NotificationToast.tsx escutar
        window.dispatchEvent(new CustomEvent('new_notification', {
          detail: { title, body }
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { requestPermissionAndSaveToken, fcmToken };
}
