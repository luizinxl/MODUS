import { Node, Edge } from '@xyflow/react';

export type IntegrationKey = 'supabase' | 'pluggy' | 'gmail' | 'calendar' | 'sendgrid' | 'ava' | 'demo' | 'googlefinance';

export interface FlowData {
  nodes: Node[];
  edges: Edge[];
}

export const integrationFlows: Record<IntegrationKey, FlowData> = {
  supabase: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 100 },
        data: { label: 'Modus App (Frontend)', icon: 'Smartphone', color: '#7C5CFC', subline: 'Interface do usuário' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 350, y: 100 },
        data: { label: 'Supabase', icon: 'Database', color: '#2ECC71', subline: 'PostgreSQL & Auth' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#2ECC71' } }
    ]
  },

  pluggy: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 100 },
        data: { label: 'Modus App', icon: 'Smartphone', color: '#7C5CFC', subline: 'Módulo Financeiro' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 300, y: 100 },
        data: { label: 'Pluggy API', icon: 'Link', color: '#64748B', subline: 'Agregador Open Finance' },
        type: 'customNode',
      },
      {
        id: '3',
        position: { x: 600, y: 0 },
        data: { label: 'Nubank / Itaú', icon: 'Briefcase', color: '#818CF8', subline: 'Instituição Financeira' },
        type: 'customNode',
      },
      {
        id: '4',
        position: { x: 600, y: 200 },
        data: { label: 'XP Investimentos', icon: 'Briefcase', color: '#F59E0B', subline: 'Corretora' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#64748B' } },
      { id: 'e2-3', source: '2', target: '3', animated: false, style: { stroke: '#818CF8' } },
      { id: 'e2-4', source: '2', target: '4', animated: false, style: { stroke: '#F59E0B' } }
    ]
  },
  gmail: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 100 },
        data: { label: 'Google Cloud (OAuth)', icon: 'Server', color: '#64748B', subline: 'Autenticação' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 300, y: 100 },
        data: { label: 'Gmail API', icon: 'Mail', color: '#EA4335', subline: 'Caixa de Entrada' },
        type: 'customNode',
      },
      {
        id: '3',
        position: { x: 600, y: 100 },
        data: { label: 'Modus OCR Engine', icon: 'Bot', color: '#7C5CFC', subline: 'Leitura de Faturas' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: false, style: { stroke: '#EA4335' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#7C5CFC', strokeDasharray: '5,5' } }
    ]
  },
  calendar: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 100 },
        data: { label: 'Google Cloud (OAuth)', icon: 'Server', color: '#64748B', subline: 'Autenticação' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 300, y: 100 },
        data: { label: 'Google Calendar API', icon: 'Calendar', color: '#4285F4', subline: 'Eventos Pessoais' },
        type: 'customNode',
      },
      {
        id: '3',
        position: { x: 600, y: 100 },
        data: { label: 'Modus App', icon: 'Smartphone', color: '#7C5CFC', subline: 'Agenda Unificada' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: false, style: { stroke: '#4285F4' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#7C5CFC', strokeDasharray: '5,5' } }
    ]
  },
  sendgrid: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 100 },
        data: { label: 'Modus App', icon: 'Smartphone', color: '#7C5CFC', subline: 'Motor de Alertas' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 300, y: 100 },
        data: { label: 'SendGrid API', icon: 'ExternalLink', color: '#0263E0', subline: 'Serviço de Email' },
        type: 'customNode',
      },
      {
        id: '3',
        position: { x: 600, y: 100 },
        data: { label: 'Caixa do Usuário', icon: 'Mail', color: '#64748B', subline: 'Notificações Recebidas' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#0263E0' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#64748B' } }
    ]
  },
  ava: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 100 },
        data: { label: 'Modus App', icon: 'Smartphone', color: '#7C5CFC', subline: 'Painel do Usuário' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 300, y: 100 },
        data: { label: 'Agente AVA', icon: 'Bot', color: '#10B981', subline: 'LLM & Tools (Antigravity)' },
        type: 'customNode',
      },
      {
        id: '3',
        position: { x: 600, y: -50 },
        data: { label: 'Supabase (DB)', icon: 'Database', color: '#2ECC71', subline: 'Consulta de Dados' },
        type: 'customNode',
      },
      {
        id: '4',
        position: { x: 600, y: 250 },
        data: { label: 'Ações do Sistema', icon: 'Server', color: '#F43F5E', subline: 'Comandos & Automação' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10B981' } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#2ECC71', strokeDasharray: '5,5' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#F43F5E', strokeDasharray: '5,5' } }
    ]
  },
  demo: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 150 },
        data: { label: 'Webhook (Trigger)', icon: 'Globe', color: '#10B981', subline: 'Recebe nova transação' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 300, y: 150 },
        data: { label: 'Formatador de Dados', icon: 'Zap', color: '#F5A623', subline: 'Limpeza e padronização' },
        type: 'customNode',
      },
      {
        id: '3',
        position: { x: 600, y: 150 },
        data: { label: 'Roteador (Switch)', icon: 'GitFork', color: '#7C5CFC', subline: 'Condição: Valor > 1000' },
        type: 'customNode',
      },
      {
        id: '4',
        position: { x: 900, y: 0 },
        data: { label: 'Banco de Dados', icon: 'Database', color: '#2ECC71', subline: 'Salva no extrato (Caminho A)' },
        type: 'customNode',
      },
      {
        id: '5',
        position: { x: 1200, y: 0 },
        data: { label: 'Notificação', icon: 'Bell', color: '#E11D48', subline: 'Alerta de alto gasto' },
        type: 'customNode',
      },
      {
        id: '6',
        position: { x: 900, y: 300 },
        data: { label: 'Sync Planilha', icon: 'Briefcase', color: '#0284C7', subline: 'Atualiza backup (Caminho B)' },
        type: 'customNode',
      },
      {
        id: '7',
        position: { x: 1200, y: 300 },
        data: { label: 'Módulo de Finanças', icon: 'Activity', color: '#059669', subline: 'Atualiza saldo' },
        type: 'customNode',
      },
      {
        id: '8',
        position: { x: 1500, y: 150 },
        data: { label: 'Sucesso', icon: 'CheckCircle', color: '#10B981', subline: 'Fim do Fluxo' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
      { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#F5A623', strokeWidth: 2 } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#2ECC71', strokeWidth: 2, strokeDasharray: '5,5' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#E11D48', strokeWidth: 2 } },
      { id: 'e3-6', source: '3', target: '6', animated: true, style: { stroke: '#0284C7', strokeWidth: 2, strokeDasharray: '5,5' } },
      { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: '#059669', strokeWidth: 2 } },
      { id: 'e5-8', source: '5', target: '8', animated: false, style: { stroke: '#334155' } },
      { id: 'e7-8', source: '7', target: '8', animated: false, style: { stroke: '#334155' } }
    ]
  },
  googlefinance: {
    nodes: [
      {
        id: '1',
        position: { x: 0, y: 100 },
        data: { label: 'Modus App', icon: 'Smartphone', color: '#7C5CFC', subline: 'Módulo de Investimentos' },
        type: 'customNode',
      },
      {
        id: '2',
        position: { x: 350, y: 100 },
        data: { label: 'Google Finance', icon: 'Globe', color: '#10B981', subline: 'Cotações e Portfólio Global' },
        type: 'customNode',
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10B981', strokeDasharray: '5,5' } }
    ]
  }
};
