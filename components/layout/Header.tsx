import React from 'react';
import { useLocation } from 'react-router-dom';
import { useContabilidade } from '../../hooks/useContabilidade';

const getPageTitle = (pathname: string): string => {
  switch (pathname) {
    case '/': return 'Dashboard';
    case '/empresas': return 'Gestão de Empresas';
    case '/plano-de-contas': return 'Plano de Contas';
    case '/livro-diario': return 'Livro Diário';
    case '/livro-razao': return 'Livro Razão';
    case '/analise-financeira': return 'Análise Financeira';
    case '/fechamento': return 'Fechamento e Apuração';
    case '/diagnostico': return 'Diagnóstico Contábil';
    default: return 'G-ConFin';
  }
};

const Header: React.FC = () => {
  const location = useLocation();
  const { empresas, empresaSelecionada, selecionarEmpresa, logout } = useContabilidade();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 no-print border-b border-blue-200">
      <h1 className="text-xl font-semibold text-black">{pageTitle}</h1>
      <div className="flex items-center space-x-4">
        {empresas.length > 0 && (
          <select
            value={empresaSelecionada?.id || ''}
            onChange={(e) => selecionarEmpresa(e.target.value)}
            className="block w-full max-w-xs pl-3 pr-10 py-2 text-base bg-white border border-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="" disabled>Selecione uma empresa</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.nomeFantasia}</option>
            ))}
          </select>
        )}
        <button onClick={logout} className="text-sm font-medium text-black hover:text-blue-600">
          Sair
        </button>
      </div>
    </header>
  );
};

export default Header;