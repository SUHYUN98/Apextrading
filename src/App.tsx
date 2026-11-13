import { useEffect } from 'react';
import { Workspace } from '@/components/layout/Workspace';
import { initializeStore, useStore } from '@/store/useStore';

function App() {
  const darkMode = useStore((s) => s.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    initializeStore();
  }, []);

  return <Workspace />;
}

export default App;
