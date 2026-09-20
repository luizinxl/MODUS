import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  House,
  GraduationCap,
  Wallet,
  TrendUp,
  User,
  Gear,
  ListChecks,
  ShoppingCart,
  CalendarBlank,
  Pencil,
  CaretLeft,
  CaretRight,
  X
} from '@phosphor-icons/react';
import clsx from 'clsx';
import Logo from '@/components/common/Logo';
import { useModuleColors, routeToKeyMap, defaultModuleColors } from '@/hooks/useModuleColors';
export const sidebarModules = [
  { to: '/', label: 'Início', icon: House },
  { to: '/estudos', label: 'Estudos', icon: GraduationCap },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/investimentos', label: 'Investimentos', icon: TrendUp },
  { to: '/pessoal', label: 'Pessoal', icon: User },
];

function ColorPickerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { colors, updateColor, restoreDefaults } = useModuleColors();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-foreground font-semibold">Cores dos Módulos</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {sidebarModules.map((m) => {
            const moduleKey = routeToKeyMap[m.to] || 'inicio';
            const currentColor = colors[moduleKey] || defaultModuleColors[moduleKey] || '#7C5CFC';
            return (
              <div key={moduleKey} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <m.icon size={20} className="text-muted-foreground" weight="regular" />
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                </div>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => updateColor(moduleKey, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
                />
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={restoreDefaults}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Restaurar padrões
          </button>
        </div>
      </div>
    </div>
  );
}


export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('@modus:sidebar-collapsed');
    return saved === 'true';
  });
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const { colors } = useModuleColors();
  
  useEffect(() => {
    localStorage.setItem('@modus:sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <>
    <aside className={clsx(
      "shrink-0 flex flex-col justify-between h-full transition-all duration-300 relative py-2",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Botão de Toggle */}
      <motion.button 
        onClick={toggleSidebar}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute -right-3 top-8 w-6 h-6 bg-card border border-border/50 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10 shadow-lg backdrop-blur-md"
      >
        {isCollapsed ? <CaretRight size={14} weight="bold" /> : <CaretLeft size={14} weight="bold" />}
      </motion.button>

      <div className="flex-1 flex flex-col pt-6 pb-4 overflow-hidden items-center min-h-0 px-3">
        {/* Logo */}
        <div className={clsx("pb-8 flex w-full", isCollapsed ? "justify-center" : "justify-start pl-3")}>
          <Logo size="sm" showWordmark={!isCollapsed} className={isCollapsed ? "justify-center" : "justify-start"} />
        </div>

        {/* Módulos Container (Pill) */}
        <div className="flex-1 flex flex-col transition-all duration-300 min-h-0 w-full">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-4 pb-4 shrink-0">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Menu Principal</span>
              <button 
                onClick={() => setIsColorPickerOpen(true)}
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
                title="Personalizar cores"
              >
                <Pencil size={14} weight="fill" />
              </button>
            </div>
          )}
          
          <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar min-h-0 w-full">
            {sidebarModules.map((it) => {
              const moduleKey = routeToKeyMap[it.to] || 'inicio';
              const moduleColor = colors[moduleKey] || defaultModuleColors[moduleKey] || '#7C5CFC';
              return (
                <motion.div
                  key={it.to}
                  whileHover={{ x: isCollapsed ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex justify-center"
                >
                  <NavLink
                    to={it.to}
                    end={it.to === '/'}
                    title={isCollapsed ? it.label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center text-sm font-medium transition-all duration-300 shrink-0 group relative w-full',
                        isCollapsed ? 'justify-center h-12 rounded-2xl' : 'px-4 py-3 rounded-2xl gap-3',
                        isActive ? 'bg-card border border-border shadow-sm' : 'hover:bg-card/50 border border-transparent'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div 
                            layoutId="activeIndicator"
                            className="absolute left-2.5 w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: moduleColor, boxShadow: `0 0 10px ${moduleColor}` }}
                          />
                        )}
                        <it.icon 
                          size={isCollapsed ? 22 : 20} 
                          weight={isActive ? "fill" : "regular"} 
                          className={clsx(
                            "transition-colors z-10",
                            isActive ? "" : "text-muted-foreground group-hover:text-foreground",
                            isActive && !isCollapsed ? "ml-2" : ""
                          )}
                          style={isActive ? { color: moduleColor } : undefined}
                        />
                        {!isCollapsed && <span className={clsx("z-10", isActive ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground")}>{it.label}</span>}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rodapé da Sidebar (Avatar e Config) */}
      <div className="pb-6 pt-2 flex flex-col transition-all duration-300 w-full px-3 gap-1.5">
          <NavLink
            to="/configuracoes"
            title={isCollapsed ? 'Configurações' : undefined}
            className={({ isActive }) => clsx(
              "flex items-center text-sm font-medium transition-all duration-300 shrink-0 group relative w-full",
              isCollapsed ? 'justify-center h-12 rounded-2xl' : 'px-4 py-3 rounded-2xl gap-3',
              isActive ? 'bg-card border border-border shadow-sm' : 'hover:bg-card/50 border border-transparent'
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-2.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
                  />
                )}
                <Gear size={isCollapsed ? 22 : 20} weight={isActive ? "fill" : "regular"} className={clsx(
                  "transition-colors z-10",
                  isActive ? "text-primary ml-2" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!isCollapsed && <span className={clsx("z-10", isActive ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground")}>Configurações</span>}
              </>
            )}
          </NavLink>

          <div className={clsx(
            "flex items-center transition-all duration-300 cursor-pointer shrink-0 border border-transparent hover:bg-card/50",
            isCollapsed ? 'justify-center h-12 w-12 mx-auto rounded-2xl' : 'justify-between px-3 py-2.5 rounded-2xl gap-3 w-full'
          )}>
            <div className="flex items-center gap-3">
              <div className={clsx(
                "rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50",
                isCollapsed ? "w-8 h-8" : "w-8 h-8"
              )}>
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=luiz" 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground transition-colors truncate leading-tight">
                    Luiz
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate leading-tight">
                    Pro Plan
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="w-6 h-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors">
                <CaretRight size={14} weight="bold" />
              </div>
            )}
          </div>
      </div>

    </aside>
      <ColorPickerModal isOpen={isColorPickerOpen} onClose={() => setIsColorPickerOpen(false)} />
    </>
  );
}

export default Sidebar;
