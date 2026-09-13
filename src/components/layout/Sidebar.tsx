import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  GraduationCap,
  Wallet,
  TrendingUp,
  User,
  Settings,
  Home as House,
  ShoppingCart,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '@/components/common/Logo';
import { useModuleColors, routeToKeyMap, defaultModuleColors } from '@/hooks/useModuleColors';
export const sidebarModules = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/estudos', label: 'Estudos', icon: GraduationCap },
  { to: '/tarefas', label: 'Tarefas', icon: House },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/investimentos', label: 'Investimentos', icon: TrendingUp },
  { to: '/pessoal', label: 'Pessoal', icon: User },
];

function ColorPickerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { colors, updateColor, restoreDefaults } = useModuleColors();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#12141C] border border-[#232735] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#232735]">
          <h3 className="text-white font-semibold">Cores dos Módulos</h3>
          <button onClick={onClose} className="text-[#8E95A5] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {sidebarModules.map((m) => {
            const moduleKey = routeToKeyMap[m.to] || 'inicio';
            const currentColor = colors[moduleKey] || defaultModuleColors[moduleKey] || '#7C5CFC';
            return (
              <div key={moduleKey} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <m.icon size={18} className="text-[#8E95A5]" />
                  <span className="text-sm font-medium text-white">{m.label}</span>
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
        <div className="p-4 border-t border-[#232735] flex justify-end">
          <button
            onClick={restoreDefaults}
            className="text-sm text-[#8E95A5] hover:text-white underline"
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
      "shrink-0 bg-[#12141C] flex flex-col justify-between h-full transition-all duration-300 relative border-r border-[#1E2230]",
      isCollapsed ? "w-20" : "w-60"
    )}>
      {/* Botão de Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3.5 top-8 w-7 h-7 bg-[#1A1D27] border border-[#282E42] rounded-full flex items-center justify-center text-[#8E95A5] hover:text-white hover:bg-[#202535] transition-colors z-10 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="flex-1 flex flex-col pt-6 pb-4 overflow-hidden items-center min-h-0">
        {/* Logo */}
        <div className={clsx("pb-8 flex w-full", isCollapsed ? "justify-center px-0" : "justify-start px-6")}>
          <Logo size="sm" showWordmark={!isCollapsed} className={isCollapsed ? "justify-center" : "justify-start"} />
        </div>

        {/* Módulos Container (Pill) */}
        <div className={clsx(
          "flex-1 flex flex-col transition-all duration-300 min-h-0 w-full",
          isCollapsed ? "w-16" : "w-[calc(100%-24px)]"
        )}>
          {!isCollapsed && (
            <div className="flex items-center justify-end px-4 pb-3 shrink-0">
              <button 
                onClick={() => setIsColorPickerOpen(true)}
                className="text-[#636A7E] hover:text-white transition-colors"
                title="Personalizar cores"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          
          <div className={clsx(
            "bg-[#1A1D27]/80 flex flex-col gap-2 py-2 overflow-y-auto custom-scrollbar border border-[#232735] min-h-0",
            isCollapsed ? "rounded-full px-2 items-center" : "rounded-3xl px-2"
          )}>
            {sidebarModules.map((it) => {
              const moduleKey = routeToKeyMap[it.to] || 'inicio';
              const moduleColor = colors[moduleKey] || defaultModuleColors[moduleKey] || '#7C5CFC';
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  title={isCollapsed ? it.label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center text-sm font-medium transition-all duration-200 shrink-0 group',
                      isCollapsed ? 'justify-center w-11 h-11 rounded-full' : 'px-4 py-2.5 rounded-2xl gap-3 w-full',
                      isActive ? '' : 'hover:bg-[#202535]'
                    )
                  }
                  style={({ isActive }) => isActive ? {
                    backgroundColor: moduleColor,
                    color: '#FFFFFF',
                    boxShadow: `0 4px 14px -4px ${moduleColor}80`
                  } : {
                    color: '#8E95A5'
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <it.icon 
                        size={isCollapsed ? 22 : 18} 
                        strokeWidth={isActive ? 2.5 : 2} 
                        className={!isActive && !isCollapsed ? "group-hover:text-white transition-colors" : ""}
                      />
                      {!isCollapsed && (
                        <span className={clsx("transition-colors", isActive ? "text-white" : "group-hover:text-white")}>
                          {it.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rodapé da Sidebar (Avatar e Config em Pill) */}
      <div className={clsx(
        "pb-6 pt-2 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16 mx-auto items-center" : "w-[calc(100%-24px)] mx-auto"
      )}>
        <div className={clsx(
          "bg-[#1A1D27]/80 border border-[#232735] flex flex-col gap-2 p-2",
          isCollapsed ? "rounded-full items-center" : "rounded-3xl"
        )}>
          {/* Item Extra que parece existir na referencia antes do avatar */}
          <NavLink
            to="/configuracoes"
            title={isCollapsed ? 'Configurações' : undefined}
            className={({ isActive }) => clsx(
              "flex items-center transition-colors shrink-0 group",
              isCollapsed ? 'justify-center w-11 h-11 rounded-full' : 'px-4 py-2.5 rounded-2xl gap-3 w-full',
              isActive ? 'bg-[#7C5CFC] text-white shadow-lg' : 'text-[#8E95A5] hover:text-white hover:bg-[#202535]'
            )}
            style={({ isActive }) => isActive ? {
              backgroundColor: colors['configuracoes'] || defaultModuleColors['configuracoes'] || '#8E95A5',
              boxShadow: `0 4px 14px -4px ${colors['configuracoes'] || defaultModuleColors['configuracoes'] || '#8E95A5'}80`
            } : {}}
          >
            {({ isActive }) => (
              <>
                <Settings size={isCollapsed ? 22 : 18} strokeWidth={isActive ? 2.5 : 2} className={!isActive && !isCollapsed ? "group-hover:text-white transition-colors" : ""} />
                {!isCollapsed && <span className={clsx("text-sm font-medium transition-colors", isActive ? "text-white" : "group-hover:text-white")}>Configurações</span>}
              </>
            )}
          </NavLink>

          <div className={clsx(
            "flex items-center bg-[#202535] transition-colors cursor-pointer shrink-0",
            isCollapsed ? 'justify-center w-11 h-11 rounded-full p-1' : 'justify-between px-2 py-1.5 rounded-2xl gap-3 w-full'
          )}>
            <div className="flex items-center gap-3">
              <div className={clsx(
                "rounded-full bg-[#2A2F42] flex items-center justify-center overflow-hidden shrink-0",
                isCollapsed ? "w-9 h-9" : "w-8 h-8"
              )}>
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=luiz" 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              {!isCollapsed && (
                <span className="text-sm font-medium text-[#D1D5DB] transition-colors truncate">
                  luiz
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className="w-6 h-6 flex items-center justify-center text-[#636A7E]">
                <ChevronRight size={16} />
              </div>
            )}
          </div>
        </div>
      </div>

    </aside>
      <ColorPickerModal isOpen={isColorPickerOpen} onClose={() => setIsColorPickerOpen(false)} />
    </>
  );
}

export default Sidebar;
