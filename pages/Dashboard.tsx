import React, { useMemo } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { Card, Button } from '../components/ui/index';
import { BuildingOfficeIcon, PencilSquareIcon, ChartBarIcon, BanknotesIcon, ArrowsRightLeftIcon } from '../components/ui/Icons';
import { Link } from 'react-router-dom';
import { calcularSaldos, formatCurrency, calcularResultadoExercicio } from '../services/contabilidadeService';

const Dashboard: React.FC = () => {
  const { empresaSelecionada } = useContabilidade();

  const dashboardData = useMemo(() => {
    if (!empresaSelecionada) return null;

    // Correct: Use dedicated function for period's profit/loss
    const resultadoPeriodo = calcularResultadoExercicio(empresaSelecionada);

    // Correct: Use final balances from ALL non-deleted entries for BS items
    const lancamentosTotais = empresaSelecionada.lancamentos.filter(l => !l.isDeleted);
    const saldos = calcularSaldos(empresaSelecionada.planoDeContas, lancamentosTotais);

    const findSaldo = (codigo: string) => {
        const conta = empresaSelecionada.planoDeContas.find(c => c.codigo === codigo);
        return conta ? saldos.get(conta.id) || 0 : 0;
    };

    return {
      resultadoPeriodo: resultadoPeriodo,
      saldoCaixa: findSaldo('1.1.1'), // Caixa e Equivalentes de Caixa
      contasReceber: findSaldo('1.1.2'), // Contas a Receber de Clientes
      contasPagar: findSaldo('2.1.1'), // Fornecedores
    };
  }, [empresaSelecionada]);


  return (
    <div>
      <h2 className="text-2xl font-semibold text-black mb-6">Dashboard</h2>
      
      {empresaSelecionada ? (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="text-xl font-semibold text-black">{empresaSelecionada.razaoSocial}</h3>
            <p className="text-sm text-black">{empresaSelecionada.nomeFantasia} | CNPJ: {empresaSelecionada.cnpj}</p>
          </Card>

          {dashboardData && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                            <ChartBarIcon className="h-6 w-6 text-black"/>
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-black truncate">Resultado do Período</p>
                            <p className="text-2xl font-bold text-black">{formatCurrency(dashboardData.resultadoPeriodo)}</p>
                        </div>
                    </div>
                </Card>
                 <Card className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                            <BanknotesIcon className="h-6 w-6 text-black"/>
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-black truncate">Saldo em Caixa</p>
                            <p className="text-2xl font-bold text-black">{formatCurrency(dashboardData.saldoCaixa)}</p>
                        </div>
                    </div>
                 </Card>
                <Card className="p-5">
                     <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                           <ArrowsRightLeftIcon className="h-6 w-6 text-black"/>
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-black truncate">Receber / Pagar</p>
                             <div className="flex items-baseline space-x-2">
                                <p className="text-lg font-bold text-black">{formatCurrency(dashboardData.contasReceber)}</p>
                                <p className="text-sm text-black">/</p>
                                <p className="text-lg font-bold text-black">{formatCurrency(dashboardData.contasPagar)}</p>
                            </div>
                        </div>
                    </div>
                </Card>
             </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-black mb-3">Acessos Rápidos</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link to="/livro-diario">
                    <Card className="p-6 hover:shadow-lg transition-shadow text-center">
                        <PencilSquareIcon className="h-10 w-10 text-black mb-2 mx-auto"/>
                        <h4 className="font-semibold text-lg text-black">Novo Lançamento</h4>
                        <p className="text-black text-sm">Registre transações no Livro Diário.</p>
                    </Card>
                </Link>
                <Link to="/analise-financeira">
                    <Card className="p-6 hover:shadow-lg transition-shadow text-center">
                        <ChartBarIcon className="h-10 w-10 text-black mb-2 mx-auto"/>
                        <h4 className="font-semibold text-lg text-black">Ver Relatórios</h4>
                        <p className="text-black text-sm">Acesse BP, DRE, DFC e DMPL.</p>
                    </Card>
                </Link>
                <Link to="/empresas">
                    <Card className="p-6 hover:shadow-lg transition-shadow text-center">
                        <BuildingOfficeIcon className="h-10 w-10 text-black mb-2 mx-auto"/>
                        <h4 className="font-semibold text-lg text-black">Trocar Empresa</h4>
                        <p className="text-black text-sm">Gerencie suas empresas cadastradas.</p>
                    </Card>
                </Link>
            </div>
          </div>
        </div>
      ) : (
        <Card className="text-center p-8">
          <h3 className="text-xl font-semibold text-black mb-2">Bem-vindo ao ContabilPro!</h3>
          <p className="text-black mb-4">Para começar, cadastre ou selecione uma empresa.</p>
          <Link to="/empresas">
            <Button variant="primary">Ir para Empresas</Button>
          </Link>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;