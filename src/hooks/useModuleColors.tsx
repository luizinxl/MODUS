import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

type ModuleColors = Record<string, string>;

export const defaultModuleColors: ModuleColors = {
  inicio: '#7C5CFC',
  tarefas: '#7C5CFC',
  financas: '#22C55E',
  investimentos: '#14B8A6',
  academico: '#F97316',
  agenda: '#EC4899',
  pessoal: '#818CF8',
  casa: '#F59E0B',
};

// Map old routes to new keys (if necessary, though we'll use keys directly now)
export const routeToKeyMap: Record<string, string> = {
  '/': 'inicio',
  '/estudos': 'academico',
  '/tarefas': 'tarefas',
  '/compras': 'compras', // Wait, compras is not in the list, but it exists in sidebar. We can fallback to default. Let's just use what was requested.
  '/financas': 'financas',
  '/investimentos': 'investimentos',
  '/pessoal': 'pessoal',
  '/configuracoes': 'configuracoes', // Usually grey
};

interface ModuleColorsContextType {
  colors: ModuleColors;
  updateColor: (moduleKey: string, color: string) => void;
  restoreDefaults: () => void;
  loading: boolean;
}

const ModuleColorsContext = createContext<ModuleColorsContextType | undefined>(undefined);

export function ModuleColorsProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ModuleColors>(() => {
    const saved = localStorage.getItem('dailys_module_colors');
    if (saved) {
      try {
        return { ...defaultModuleColors, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaultModuleColors;
  });
  const [loading, setLoading] = useState(true);

  // Apply colors to DOM
  const applyColorsToDOM = useCallback((currentColors: ModuleColors) => {
    Object.entries(currentColors).forEach(([key, color]) => {
      document.documentElement.style.setProperty(`--color-${key}`, color);
    });
  }, []);

  // Fetch initial colors from Supabase
  useEffect(() => {
    let isMounted = true;
    
    async function fetchPreferences() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .select('module_colors')
          .eq('id', userData.user.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116 is not found (0 rows)
            console.error('Error fetching module colors:', error);
          }
          // If no row exists, we just use defaults and apply to DOM
          applyColorsToDOM(defaultModuleColors);
        } else if (data && data.module_colors) {
          const mergedColors = { ...defaultModuleColors, ...data.module_colors };
          if (isMounted) {
            setColors(mergedColors);
            localStorage.setItem('dailys_module_colors', JSON.stringify(mergedColors));
            applyColorsToDOM(mergedColors);
          }
        } else {
          applyColorsToDOM(defaultModuleColors);
        }
      } catch (err) {
        console.error('Failed to fetch module colors', err);
        applyColorsToDOM(defaultModuleColors);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPreferences();
    return () => { isMounted = false; };
  }, [applyColorsToDOM]);

  // Use a ref to store the latest colors for debounced saving
  const colorsRef = React.useRef(colors);
  colorsRef.current = colors;

  const saveToSupabase = useCallback(
    async (newColors: ModuleColors) => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        // Upsert style: we update if exists. To ensure it inserts if it doesn't exist, we can just upsert.
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            { id: userData.user.id, module_colors: newColors },
            { onConflict: 'id' }
          );

        if (error) console.error('Error saving module colors:', error);
      } catch (err) {
        console.error('Failed to save module colors', err);
      }
    },
    []
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      // Don't save on initial load if we just fetched
      if (!loading) {
        saveToSupabase(colors);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [colors, loading, saveToSupabase]);

  const updateColor = (moduleKey: string, color: string) => {
    const newColors = { ...colorsRef.current, [moduleKey]: color };
    setColors(newColors);
    localStorage.setItem('dailys_module_colors', JSON.stringify(newColors));
    applyColorsToDOM(newColors);
  };

  const restoreDefaults = () => {
    setColors(defaultModuleColors);
    localStorage.setItem('dailys_module_colors', JSON.stringify(defaultModuleColors));
    applyColorsToDOM(defaultModuleColors);
    // Setting state will trigger the useEffect debounce to save to Supabase
  };

  return (
    <ModuleColorsContext.Provider value={{ colors, updateColor, restoreDefaults, loading }}>
      {children}
    </ModuleColorsContext.Provider>
  );
}

export function useModuleColors() {
  const context = useContext(ModuleColorsContext);
  if (!context) {
    throw new Error('useModuleColors must be used within a ModuleColorsProvider');
  }
  return context;
}
