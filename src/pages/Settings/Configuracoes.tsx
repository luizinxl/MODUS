import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Home, CheckSquare, Wallet, TrendingUp, GraduationCap, Calendar, User, Home as House } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useModuleColors, defaultModuleColors, routeToKeyMap } from '@/hooks/useModuleColors';
import { IntegrationFlowModal } from '@/components/settings/IntegrationFlowModal';
import { sidebarModules } from '@/components/layout/Sidebar';
import { IntegrationKey } from '@/data/integrationFlows';

interface Receipt {
  id: string;
  merchant: string | null;
  total_amount: number | null;
  purchased_at: string | null;
  raw_text: string | null;
  created_at: string;
}

function parseReceiptText(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const merchant = lines[0] ?? null;

  let total: number | null = null;
  const totalLineRegex = /(total|valor total|total a pagar)/i;
  const numberRegex = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/;
  for (const line of lines) {
    if (totalLineRegex.test(line)) {
      const match = line.match(numberRegex);
      if (match) {
        const normalized = match[1].replace(/\./g, '').replace(',', '.');
        const value = parseFloat(normalized);
        if (!isNaN(value)) {
          total = value;
        }
      }
    }
  }
  return { merchant, total };
}

function IntegrationRow({ name, status, detail, onClick }: { name: string; status: 'ok' | 'pendente' | 'nao_configurado'; detail: string; onClick?: () => void }) {
  const colors: Record<string, string> = {
    ok: '#2ECC71',
    pendente: '#F5A623',
    nao_configurado: '#64748B',
  };
  const labels: Record<string, string> = {
    ok: 'Conectado',
    pendente: 'Parcial',
    nao_configurado: 'Não configurado',
  };
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-2 rounded-lg border-b border-[#232735] hover:bg-[#202535] transition-colors text-left group"
    >
      <div>
        <p className="text-sm text-white font-medium">{name}</p>
        <p className="text-xs text-[#8E95A5] mt-0.5">{detail}</p>
      </div>
      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: colors[status], backgroundColor: `${colors[status]}1A` }}>
        {labels[status]}
      </span>
    </button>
  );
}


const PREDEFINED_COLORS = [
  '#7C5CFC', '#1C64EF', '#22C55E', '#14B8A6', 
  '#F97316', '#EC4899', '#818CF8', '#F59E0B'
];

export default function Page() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { colors, updateColor, restoreDefaults } = useModuleColors();
  const [selectedFlow, setSelectedFlow] = useState<IntegrationKey | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoadingReceipts(true);
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error) setReceipts(data ?? []);
    setLoadingReceipts(false);
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError(null);
    setOcrStatus('Lendo imagem...');

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');
      setOcrStatus('Reconhecendo texto (OCR)...');
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const { merchant, total } = parseReceiptText(data.text);

      const { error: insertError } = await supabase.from('receipts').insert({
        merchant,
        total_amount: total,
        raw_text: data.text,
        purchased_at: new Date().toISOString().slice(0, 10),
      });
      if (insertError) throw insertError;

      setOcrStatus('Nota fiscal processada com sucesso.');
      await fetchReceipts();
    } catch (err: any) {
      setOcrError(err?.message ?? 'Erro ao processar a nota fiscal.');
      setOcrStatus(null);
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Configurações</h1>
        <p className="text-[#8E95A5] text-sm mt-1">Integrações, preferências e o agente de nota fiscal.</p>
      </div>

      <Card variant="default" className="p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Nota Fiscal (OCR)</h2>
        <p className="text-xs text-[#8E95A5] mb-4">Envie uma foto ou print da nota fiscal para extrair o total automaticamente. Processado no seu navegador — nenhuma imagem é enviada a terceiros.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={ocrLoading}
          className="hidden"
          id="receipt-upload"
        />
        <label
          htmlFor="receipt-upload"
          className={`inline-block px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${ocrLoading ? 'bg-[#1D2029] text-[#64748B] cursor-not-allowed' : 'bg-[#7C5CFC] hover:bg-[#6D4AEF] text-white'}`}
        >
          {ocrLoading ? (ocrStatus ?? 'Processando...') : 'Enviar nota fiscal'}
        </label>

        {ocrError && <p className="text-sm text-[#F43F5E] mt-3">{ocrError}</p>}
        {!ocrLoading && ocrStatus && !ocrError && <p className="text-sm text-[#2ECC71] mt-3">{ocrStatus}</p>}

        <div className="mt-5 space-y-2">
          {!loadingReceipts && receipts.length === 0 && (
            <p className="text-sm text-[#8E95A5]">Nenhuma nota fiscal enviada ainda.</p>
          )}
          {receipts.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-[#1D2029] border border-[#232735] px-3 py-2">
              <span className="text-sm text-white">{r.merchant ?? 'Estabelecimento não identificado'}</span>
              <span className="text-sm font-semibold text-[#2ECC71]">
                {r.total_amount != null ? `R$ ${r.total_amount.toFixed(2)}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="default" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Cores dos Módulos</h2>
            <p className="text-xs text-[#8E95A5] mt-1">Personalize a cor de acento de cada módulo.</p>
          </div>
          <button 
            onClick={restoreDefaults}
            className="px-3 py-1.5 text-xs font-medium border border-[#282E42] rounded-lg text-[#8E95A5] hover:text-white hover:bg-[#202535] transition-colors"
          >
            Restaurar padrões
          </button>
        </div>
        
        <div className="space-y-4 mt-6">
          {sidebarModules.map(mod => {
            const moduleKey = routeToKeyMap[mod.to] || 'inicio';
            const currentColor = colors[moduleKey] || defaultModuleColors[moduleKey] || '#7C5CFC';
            const isCustomColor = !PREDEFINED_COLORS.some(pc => pc.toUpperCase() === currentColor.toUpperCase());
            
            return (
              <div key={moduleKey} className="flex items-center justify-between border-b border-[#232735] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ backgroundColor: `${currentColor}1A`, color: currentColor }}
                  >
                    <mod.icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-white">{mod.label}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {PREDEFINED_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateColor(moduleKey, c)}
                      className={`w-6 h-6 rounded-full transition-all border-2 ${currentColor.toUpperCase() === c.toUpperCase() ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  
                  {/* Custom Color Input */}
                  <div className={`relative w-6 h-6 rounded-full overflow-hidden transition-all border-2 ${isCustomColor ? 'border-white scale-110' : 'border-[#282E42] hover:scale-110'}`}>
                     <div 
                       className="absolute inset-0 flex items-center justify-center text-white font-bold" 
                       style={{ 
                         background: isCustomColor ? currentColor : 'conic-gradient(from 90deg, red, yellow, green, cyan, blue, magenta, red)', 
                         pointerEvents: 'none',
                         fontSize: '10px'
                       }}
                     >
                       {isCustomColor ? '' : '+'}
                     </div>
                     <input 
                       type="color"
                       value={currentColor}
                       onChange={(e) => updateColor(moduleKey, e.target.value)}
                       className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 opacity-0 cursor-pointer"
                     />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card variant="default" className="p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Integrações</h2>
        
        {/* Demonstração */}
        <div className="mb-4 p-2 rounded-xl border-2 border-[#7C5CFC]/30 bg-[#7C5CFC]/10 transition-colors hover:border-[#7C5CFC]/50">
          <IntegrationRow 
            name="Visualizador de Fluxos (Demo)" 
            status="ok" 
            detail="Fluxo complexo completo gerado como exemplo do visual n8n" 
            onClick={() => setSelectedFlow('demo')} 
          />
        </div>

        <IntegrationRow name="Supabase" status="ok" detail="Banco de dados e autenticação" onClick={() => setSelectedFlow('supabase')} />
        <IntegrationRow name="Google Finance" status="nao_configurado" detail="Integração para cotações e portfólio global" onClick={() => setSelectedFlow('googlefinance')} />
        <IntegrationRow name="Pluggy (Open Finance)" status="nao_configurado" detail="Conecte pelo card na aba Início ou Investimentos" onClick={() => setSelectedFlow('pluggy')} />
        <IntegrationRow name="Gmail (leitura de faturas)" status="nao_configurado" detail="Precisa de credenciais OAuth do Google Cloud" onClick={() => setSelectedFlow('gmail')} />
        <IntegrationRow name="Google Calendar (somente leitura)" status="nao_configurado" detail="Precisa de credenciais OAuth do Google Cloud" onClick={() => setSelectedFlow('calendar')} />
        <IntegrationRow name="Notificações (SendGrid + push)" status="nao_configurado" detail="Precisa de uma API key do SendGrid" onClick={() => setSelectedFlow('sendgrid')} />
        <IntegrationRow name="Agente AVA (Antigravity)" status="nao_configurado" detail="Bloqueado — aguardando decisão sobre credenciais de login" onClick={() => setSelectedFlow('ava')} />
      </Card>

      <Card variant="default" className="p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Preferências</h2>
        <p className="text-xs text-[#8E95A5]">Tema escuro (fundo preto puro) fixo no momento. Mais preferências chegam aqui conforme os módulos forem sendo implementados.</p>
      </Card>

      <IntegrationFlowModal 
        isOpen={!!selectedFlow} 
        onClose={() => setSelectedFlow(null)} 
        integrationKey={selectedFlow} 
      />
    </div>
  );
}
