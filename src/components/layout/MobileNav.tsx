import { NavLink } from 'react-router-dom';
import { SquaresFour, ListChecks, Wallet, TrendUp, User } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const items = [
  { to: '/', label: 'Início', icon: SquaresFour },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/investimentos', label: 'Invest', icon: TrendUp },
  { to: '/pessoal', label: 'Pessoal', icon: User },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-lg border-t border-border flex justify-around py-2 z-50">
      {items.map((it) => (
        <motion.div
          key={it.to}
          whileTap={{ scale: 0.9 }}
          className="flex-1"
        >
          <NavLink
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all min-h-[44px] min-w-[44px] w-full',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                      : 'text-muted-foreground'
                  )}
                >
                  <it.icon size={20} weight={isActive ? "fill" : "regular"} />
                </div>
                <span className={isActive ? 'text-primary font-semibold' : ''}>{it.label}</span>
              </>
            )}
          </NavLink>
        </motion.div>
      ))}
    </nav>
  );
}

export default MobileNav;
