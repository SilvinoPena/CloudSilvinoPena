import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useContabilidade } from './hooks/useContabilidade';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Empresas from './pages/Empresas';
import PlanoDeContas from './pages/PlanoDeContas';
import LivroDiario from './pages/LivroDiario';
import LivroRazao from './pages/LivroRazao';
import Relatorios from './pages/Relatorios';
import Fechamento from './pages/Fechamento';
import Diagnostico from './pages/Diagnostico';
import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { empresaSelecionada } = useContabilidade();
  // For routes that require a company to be selected
  if (!empresaSelecionada) {
     return <Navigate to="/empresas" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated } = useContabilidade();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-blue-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-blue-100 p-6">
          <Routes>
            <Route path="/login" element={<Navigate to="/" />} />
            <Route path="/register" element={<Navigate to="/" />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/plano-de-contas" element={<PrivateRoute><PlanoDeContas /></PrivateRoute>} />
            <Route path="/livro-diario" element={<PrivateRoute><LivroDiario /></PrivateRoute>} />
            <Route path="/livro-razao" element={<PrivateRoute><LivroRazao /></PrivateRoute>} />
            <Route path="/analise-financeira" element={<PrivateRoute><Relatorios /></PrivateRoute>} />
            <Route path="/fechamento" element={<PrivateRoute><Fechamento /></PrivateRoute>} />
            <Route path="/diagnostico" element={<PrivateRoute><Diagnostico /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <footer className="bg-blue-50 text-center p-2 text-xs text-black border-t border-blue-200 no-print">
          Desenvolvido por SP Automação. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
};

export default App;