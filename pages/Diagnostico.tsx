


import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContabilidade } from '../hooks/useContabilidade';
import { Card, Button, Alert, AlertDescription, Spinner } from '../components/ui';
import { AlertCircleIcon, CheckCircleIcon, PencilSquareIcon } from '../components/ui/Icons';
import { NaturezaConta, TipoConta } from '../types';
import { formatCurrency, calcularSaldos } from '../services/contabilidadeService';

// Define issue types
interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'error' | 'warning';
  link: string;
  linkText: string;
}

const Diagnostico: React.FC = () => {
  const { empresaSelecionada } = useContabilidade();
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  const runDiagnostics = () => {
    if (!empresaSelecionada) return;

    setIsLoading(true);
    setHasChecked(false); // Reset on new run
    
    // Using a timeout to ensure the loading spinner is visible for a moment for better UX
    setTimeout(() => {
        const newIssues: Issue[] = [];
        const { planoDeContas, lancamentos } = empresaSelecionada;
        
        // --- Plano de Contas Checks ---
        // 1. Contas de resultado sem classificação na DRE
        const saldosPeriodo = calcularSaldos(planoDeContas, lancamentos.filter(l => !l.isDeleted && !l.isEncerramento));
        planoDeContas.forEach(c => {
        const isResultado = [NaturezaConta.CUSTO, NaturezaConta.DESPESA, NaturezaConta.RECEITA].includes(c.natureza);
        const temSaldo = (saldosPeriodo.get(c.id) || 0) !== 0;
        if (c.tipo === TipoConta.ANALITICA && isResultado && !c.tipoDRE && temSaldo) {
            newIssues.push({
            id: `pdc_no_dre_${c.id}`,
            title: 'Conta de Resultado sem Classificação na DRE',
            description: `A conta "${c.codigo} - ${c.nome}" é uma conta de resultado com saldo, mas não está classificada na DRE. Isso afetará a apuração do resultado.`,
            severity: 'error',
            link: '/plano-de-contas',
            linkText: 'Corrigir'
            });
        }
        });

        // 2. Contas analíticas sem conta pai
        planoDeContas.forEach(c => {
        if(c.tipo === TipoConta.ANALITICA && !c.paiId) {
            newIssues.push({
            id: `pdc_no_parent_${c.id}`,
            title: 'Conta Analítica sem Conta Pai',
            description: `A conta analítica "${c.codigo} - ${c.nome}" não está vinculada a nenhuma conta sintética pai.`,
            severity: 'error',
            link: '/plano-de-contas',
            linkText: 'Corrigir'
            });
        }
        });
        
        // --- Lançamentos Checks ---
        // 3. Lançamentos desbalanceados
        const lancamentosAtivos = lancamentos.filter(l => !l.isDeleted);
        lancamentosAtivos.forEach(l => {
            const totalDebito = l.partidas.reduce((acc, p) => p.tipo === 'D' ? acc + p.valor : acc, 0);
            const totalCredito = l.partidas.reduce((acc, p) => p.tipo === 'C' ? acc + p.valor : acc, 0);
            if (Math.abs(totalDebito - totalCredito) > 0.01) {
                newIssues.push({
                    id: `lcto_unbalanced_${l.id}`,
                    title: 'Lançamento Desbalanceado',
                    description: `O lançamento de ${new Date(l.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} com histórico "${l.historico}" está desbalanceado. Débitos: ${formatCurrency(totalDebito)}, Créditos: ${formatCurrency(totalCredito)}.`,
                    severity: 'error',
                    link: '/livro-diario',
                    linkText: 'Corrigir'
                });
            }
        });

        // --- Balanço Check ---
        // 4. Balanço Patrimonial desbalanceado
        const saldosBalanco = calcularSaldos(planoDeContas, lancamentos.filter(l => !l.isDeleted));
        const totalAtivo = saldosBalanco.get('1') || 0;
        const totalPassivoEPL = (saldosBalanco.get('2') || 0) + (saldosBalanco.get('3') || 0);
        const difference = totalAtivo - totalPassivoEPL;

        if (Math.abs(difference) > 0.01) {
            newIssues.push({
                id: 'bp_unbalanced',
                title: 'Balanço Patrimonial Desbalanceado',
                description: `A soma do Ativo (${formatCurrency(totalAtivo)}) não é igual à soma do Passivo + PL (${formatCurrency(totalPassivoEPL)}). A diferença é de ${formatCurrency(difference)}.`,
                severity: 'error',
                link: '/relatorios',
                linkText: 'Verificar Relatórios'
            });
        }

        setIssues(newIssues);
        setHasChecked(true);
        setIsLoading(false);
    }, 500);

  }

  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  if (!empresaSelecionada) {
    return <p>Selecione uma empresa para executar o diagnóstico.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Diagnóstico Contábil</h2>
          <p className="text-black">Ferramenta para validar a integridade e a consistência dos dados contábeis.</p>
        </div>
        <Button onClick={runDiagnostics} disabled={isLoading}>
          {isLoading ? <Spinner /> : 'Executar Verificação'}
        </Button>
      </div>

      {hasChecked && !isLoading && (
        <Card className="p-6">
           {issues.length === 0 ? (
                <Alert variant="default">
                    <CheckCircleIcon className="h-6 w-6 text-black" />
                    <div className="ml-3">
                        <h3 className="text-lg font-medium text-black">Tudo Certo!</h3>
                        <div className="text-sm text-black">
                            <p>Nenhum problema de integridade encontrado nos seus dados contábeis. Bom trabalho!</p>
                        </div>
                    </div>
                </Alert>
           ) : (
                <Alert variant="destructive">
                     <AlertCircleIcon className="h-6 w-6 text-black" />
                    <div className="ml-3">
                        <h3 className="text-lg font-medium text-black">Problemas Encontrados</h3>
                        <div className="text-sm text-black">
                            <p>Encontramos {issues.length} problema(s) que necessitam de sua atenção. Corrija-os para garantir a precisão dos seus relatórios.</p>
                        </div>
                    </div>
                </Alert>
           )}
        </Card>
      )}

      {errorIssues.length > 0 && (
        <Card>
          <div className="p-4 bg-rose-50 border-b border-rose-200">
             <h3 className="text-lg font-semibold text-black">Erros Críticos ({errorIssues.length})</h3>
          </div>
          <div className="divide-y divide-blue-200">
            {errorIssues.map(issue => (
              <div key={issue.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-grow">
                  <h4 className="font-semibold text-black">{issue.title}</h4>
                  <p className="text-sm text-black mt-1">{issue.description}</p>
                </div>
                <Link to={issue.link}>
                  <Button variant="secondary" className="ml-4 shrink-0 flex items-center">
                    <PencilSquareIcon className="h-4 w-4 mr-2" /> {issue.linkText}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

       {warningIssues.length > 0 && (
         <Card>
          <div className="p-4 bg-amber-50 border-b border-amber-200">
             <h3 className="text-lg font-semibold text-black">Avisos ({warningIssues.length})</h3>
          </div>
          <div className="divide-y divide-blue-200">
            {warningIssues.map(issue => (
              <div key={issue.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-grow">
                  <h4 className="font-semibold text-black">{issue.title}</h4>
                  <p className="text-sm text-black mt-1">{issue.description}</p>
                </div>
                 <Link to={issue.link}>
                  <Button variant="secondary" className="ml-4 shrink-0 flex items-center">
                    <PencilSquareIcon className="h-4 w-4 mr-2" /> {issue.linkText}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
};

export default Diagnostico;