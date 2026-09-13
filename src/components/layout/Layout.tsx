import { ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMobileDetect } from '@/hooks/useMobileDetect';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationToast from '@/components/notifications/NotificationToast';
import { useNotifications } from '@/hooks/useNotifications';

function NotificationInitializer() {
  const { requestPermissionAndSaveToken } = useNotifications();
  useEffect(() => {
    requestPermissionAndSaveToken();
  }, [requestPermissionAndSaveToken]);
  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  const { isMobile } = useMobileDetect();

  const content = (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <NotificationInitializer />
      <NotificationToast />
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-40">
        <NotificationBell />
      </div>
      <motion.main
        key={typeof window !== 'undefined' ? window.location.pathname : 'page'}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col"
      >
        {children}
      </motion.main>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col pb-20 bg-[#000000] text-white">
        {content}
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#000000] text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {content}
      </div>
    </div>
  );
}

export default Layout;
