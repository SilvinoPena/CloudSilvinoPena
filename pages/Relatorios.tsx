import React, { useState, useMemo } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { calcularSaldos, formatCurrency } from '../services/contabilidadeService';
import { Card, Button, Alert, AlertDescription } from '../components/ui/index';
import { ArrowDownTrayIcon, ArrowPathIcon, AlertCircleIcon, CheckCircleIcon } from '../components/ui/Icons';
import BalancoPatrimonial from '../components/reports/BalancoPatrimonial';
import DRE from '../components/reports/DRE';
import DFC from '../components/reports/DFC';
import DMPL from '../components/reports/DMPL';
import AnaliseFinanceira from '../components/reports/AnaliseFinanceira';
import { exportarRelatoriosPDF } from '../services/pdfExportService';
import { LancamentoContabil, NaturezaConta, TipoConta } from '../types';


type Relatorio = 'Visão Geral' | 'BP' | 'DRE' | 'DFC' | 'DMPL';

const AnaliseFinanceiraPage: React.FC = () => {
  const [relatorioAtivo, setRelatorioAtivo] = useState<Relatorio>('Visão Geral');
  const { empresaSelecionada } = useContabilidade();
  const [isExporting, setIsExporting] = useState(false);
  
  const lancamentosDoPeriodo = useMemo(() => 
    empresaSelecionada?.lancamentos.filter(l => !l.isDeleted && !l.isEncerramento) || [],
  [empresaSelecionada?.lancamentos]);
  
  const lancamentosTotais = useMemo(() => 
    empresaSelecionada?.lancamentos.filter(l => !l.isDeleted) || [],
  [empresaSelecionada?.lancamentos]);

  const saldosPeriodo = useMemo(() => {
    if (!empresaSelecionada) return new Map<string, number>();
    return calcularSaldos(empresaSelecionada.planoDeContas, lancamentosDoPeriodo);
  }, [empresaSelecionada, lancamentosDoPeriodo]);

  const saldosBalanco = useMemo(() => {
    if (!empresaSelecionada) return new Map<string, number>();
    return calcularSaldos(empresaSelecionada.planoDeContas, lancamentosTotais);
  }, [empresaSelecionada, lancamentosTotais]);


  const validacaoIntegridade = useMemo(() => {
    if(!empresaSelecionada) return { isBalanced: true, difference: 0, contasNaoClassificadas: [] };

    const { planoDeContas } = empresaSelecionada;
    const findSaldo = (codigo: string) => {
        const conta = planoDeContas.find(c => c.codigo === codigo);
        return conta ? saldosBalanco.get(conta.id) || 0 : 0;
    };

    const totalAtivo = findSaldo('1');
    const totalPassivoEPL = findSaldo('2') + findSaldo('3');
    const difference = totalAtivo - totalPassivoEPL;

    const contasNaoClassificadas = empresaSelecionada.planoDeContas.filter(c => {
        const isResultado = [NaturezaConta.CUSTO, NaturezaConta.DESPESA, NaturezaConta.RECEITA].includes(c.natureza);
        const saldo = saldosPeriodo.get(c.id) || 0;
        // A conta é de resultado, tem saldo, é analítica mas não tem classificação na DRE
        return isResultado && !c.tipoDRE && saldo !== 0 && c.tipo === TipoConta.ANALITICA;
    });

    return {
      isBalanced: Math.abs(difference) < 0.01,
      difference: difference,
      contasNaoClassificadas,
    };
  }, [saldosBalanco, saldosPeriodo, empresaSelecionada]);

  const handleExport = async () => {
    if (!empresaSelecionada) return;
    if (!validacaoIntegridade.isBalanced) {
        if (!window.confirm(`Atenção: O balanço está desbalanceado em ${formatCurrency(validacaoIntegridade.difference)}. Isso pode indicar erros nos lançamentos. Deseja exportar os relatórios mesmo assim para análise?`)) {
            return;
        }
    }
    setIsExporting(true);
    try {
      await exportarRelatoriosPDF(empresaSelecionada);
    } catch (error) {
      console.error("Falha ao exportar PDF:", error);
      alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
      setIsExporting(false);
    }
  }

  if (!empresaSelecionada) {
    return <p>Selecione uma empresa para ver os relatórios.</p>;
  }

  const renderRelatorio = () => {
    switch (relatorioAtivo) {
        case 'Visão Geral':
            return <AnaliseFinanceira empresa={empresaSelecionada} saldos={saldosBalanco} />;
        case 'BP':
            return <BalancoPatrimonial empresa={empresaSelecionada} saldos={saldosBalanco} />;
        case 'DRE':
            return <DRE empresa={empresaSelecionada} saldos={saldosPeriodo} />;
        case 'DFC':
            return <DFC empresa={empresaSelecionada} saldosBalanco={saldosBalanco} />;
        case 'DMPL':
            return <DMPL empresa={empresaSelecionada} saldos={saldosBalanco} lancamentosPeriodo={lancamentosDoPeriodo} />;
        default:
            return null;
    }
  }


  return (
    <div>
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-2xl font-semibold text-black">Análise Financeira</h2>
        <div className="flex items-center gap-4">
          <div className="flex space-x-1 bg-blue-200 p-1 rounded-lg">
            {(['Visão Geral', 'BP', 'DRE', 'DFC', 'DMPL'] as Relatorio[]).map(r => (
              <button 
                key={r}
                onClick={() => setRelatorioAtivo(r)} 
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${relatorioAtivo === r ? 'bg-white shadow text-black' : 'text-black hover:bg-blue-100/50'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2">
            {isExporting ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" /> Gerando PDF...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-5 w-5" /> Exportar PDF
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="space-y-4 mb-6 no-print">
        {!validacaoIntegridade.isBalanced && (
            <Alert variant="destructive">
            <AlertCircleIcon className="h-5 w-5" />
            <AlertDescription>
                <strong className="text-black">Balanço Desbalanceado:</strong> A diferença entre Ativo e (Passivo + PL) é de {formatCurrency(validacaoIntegridade.difference)}. Revise os lançamentos ou o processo de apuração.
            </AlertDescription>
            </Alert>
        )}
        {validacaoIntegridade.contasNaoClassificadas.length > 0 && (
             <Alert variant="destructive">
             <AlertCircleIcon className="h-5 w-5" />
             <AlertDescription>
                 <strong className="text-black">Contas de Resultado Não Classificadas:</strong> As seguintes contas possuem saldo mas não estão vinculadas à DRE no Plano de Contas: {validacaoIntegridade.contasNaoClassificadas.map(c => c.nome).join(', ')}. Vá ao Plano de Contas para corrigir.
             </AlertDescription>
             </Alert>
        )}
        {validacaoIntegridade.isBalanced && validacaoIntegridade.contasNaoClassificadas.length === 0 && (
             <Alert variant="default">
             <CheckCircleIcon className="h-5 w-5 text-black" />
             <AlertDescription>
                 <strong className="text-black">Integridade OK:</strong> O balanço está balanceado e as contas de resultado estão corretamente classificadas.
             </AlertDescription>
             </Alert>
        )}
      </div>


      <Card className="print-container p-6">
        {renderRelatorio()}
      </Card>
    </div>
  );
};

export default AnaliseFinanceiraPage;