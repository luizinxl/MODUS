import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

(async () => {
  const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  await s
    .from('academic_sync_state')
    .update({
      last_morning_payload: JSON.stringify({
        courses: [
          { code: 'HTD-001', name: 'História do Design', progress: 100 },
          { code: 'DGL-001', name: 'Design Gráfico', progress: 45 },
          { code: 'PWE-001', name: 'Programação Web', progress: 12 },
          { code: 'MKT-001', name: 'Marketing Digital', progress: 87 },
          { code: 'TCC-001', name: 'Trabalho de Conclusão de Curso', progress: 5 }
        ],
      }),
    })
    .eq('id', '5e1e7960-93cb-4f36-a36f-578dff2886f4');
  console.log('Mocked!');
})();
