import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import AcademicDashboard from '@/pages/Academic';
import Financas from '@/pages/Financial/Financas';
import Investimentos from '@/pages/Financial/Investimentos';
import Pessoal from '@/pages/Personal/Pessoal';
import Tarefas from '@/pages/Tarefas';
import Compras from '@/pages/Household/Compras';
import Lembretes from '@/pages/Lembretes';
import Configuracoes from '@/pages/Settings/Configuracoes';
import { ModuleColorsProvider } from '@/hooks/useModuleColors';

export default function App() {
  const location = useLocation();

  return (
    <ModuleColorsProvider>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/estudos" element={<AcademicDashboard />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/financas" element={<Financas />} />
            <Route path="/investimentos" element={<Investimentos />} />
            <Route path="/pessoal" element={<Pessoal />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/lembretes" element={<Lembretes />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </ModuleColorsProvider>
  );
}
