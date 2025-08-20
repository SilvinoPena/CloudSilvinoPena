

import { useContext } from 'react';
import { ContabilidadeContext } from '../context/ContabilidadeContext';

export const useContabilidade = () => {
  const context = useContext(ContabilidadeContext);
  if (context === undefined) {
    throw new Error('useContabilidade must be used within a ContabilidadeProvider');
  }
  return context;
};