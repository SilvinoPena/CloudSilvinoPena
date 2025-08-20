import React, { useMemo } from 'react';
import { Empresa, LancamentoContabil, TipoConta } from '../../types';
import { getValoresDRE, getVariacoesDFC, formatCurrency } from '../../services/contabilidadeService';
import ReportRow from './ReportRow';

// Helper function to calculate raw balances, as it's needed here now.
function calcularSaldosBrutosPeriodo(planoDeContas: any[], lancamentos: LancamentoContabil[]): Map<string, number> {
    const saldosBrutos = new Map<string, number>();
    planoDeContas.forEach(c => saldosBrutos.set(c.id, 0));

    lancamentos.forEach(lancamento => {
        lancamento.partidas.forEach(partida => {
            const conta = planoDeContas.find(c => c.id === partida.contaId);
            if (conta && conta.tipo === TipoConta.ANALITICA) {
                const saldoAtual = saldosBrutos.get(partida.contaId) || 0;
                const valor = partida.tipo === 'D' ? partida.valor : -partida.valor;
                saldosBrutos.set(partida.contaId, saldoAtual + valor);
            }
        });
    });
    return saldosBrutos;
}


interface Props {
    empresa: Empresa;
    saldosBalanco: Map<string, number>; // Use the final balances from BP
}

const DFC: React.FC<Props> = ({ empresa, saldosBalanco }) => {
    const { planoDeContas } = empresa;

    const lancamentosPeriodo = useMemo(() => 
        empresa.lancamentos.filter(l => !l.isDeleted && !l.isEncerramento), 
    [empresa.lancamentos]);
    
    // DFC calculations must be based on period movements.
    const { dre, variacoes, despesaDepreciacao } = useMemo(() => {
        const saldosBrutosPeriodo = calcularSaldosBrutosPeriodo(planoDeContas, lancamentosPeriodo);
        const dreData = getValoresDRE(planoDeContas, saldosBrutosPeriodo);
        const variacoesData = getVariacoesDFC(planoDeContas, lancamentosPeriodo);

        // Recalculate depreciation expense based on period's raw movements.
        const depAccount = planoDeContas.find(c => c.codigo === '5.2.3.01'); // Despesa com Depreciação
        const depExpense = depAccount ? (saldosBrutosPeriodo.get(depAccount.id) || 0) : 0;
        
        return { dre: dreData, variacoes: variacoesData, despesaDepreciacao: depExpense };
    }, [planoDeContas, lancamentosPeriodo]);

    const fco = dre.lucroLiquido + despesaDepreciacao + variacoes.FCO.total;
    const fci = variacoes.FCI.total;
    const fcf = variacoes.FCF.total;

    const fluxoCaixaLiquido = fco + fci + fcf;

    // Use the final cash balance from the Balance Sheet for reconciliation.
    const contaCaixaEquivalentes = planoDeContas.find(c => c.codigo === '1.1.1');
    const saldoFinalCaixa = contaCaixaEquivalentes ? saldosBalanco.get(contaCaixaEquivalentes.id) || 0 : 0;
    // The initial cash balance is derived. This is the core of the indirect method reconciliation.
    const saldoInicialCaixa = saldoFinalCaixa - fluxoCaixaLiquido;

  return (
    <div id="dfc">
      <h3 className="text-xl font-semibold mb-4 text-center text-black">Demonstração dos Fluxos de Caixa (Método Indireto)</h3>
       <p className="text-center text-black mb-2">{empresa.razaoSocial}</p>
      <p className="text-center text-sm text-black mb-6">Período Findo em 31/12/XXXX</p>
      <table className="min-w-full bg-white">
        <thead>
            <tr>
                <th className="py-2 px-4 bg-blue-50 text-left text-sm font-semibold text-black w-4/5">Descrição</th>
                <th className="py-2 px-4 bg-blue-50 text-right text-sm font-semibold text-black">Valor</th>
            </tr>
        </thead>
        <tbody className="text-black">
            <ReportRow label="Fluxo de Caixa das Atividades Operacionais" value="" level={0} bold colSpan={2} />
            <ReportRow label="Lucro Líquido do Exercício" value={dre.lucroLiquido} level={1} />
            <ReportRow label="Ajustes para reconciliar o resultado líquido ao caixa:" value="" level={1} bold colSpan={2}/>
            { despesaDepreciacao !== 0 && <ReportRow label="Depreciação" value={despesaDepreciacao} level={2} /> }
            {variacoes.FCO.detalhe.map(item => <ReportRow key={item.nome} label={item.nome} value={item.variacao} level={2} />)}
            <ReportRow label="(=) Caixa Líquido das Atividades Operacionais (FCO)" value={fco} level={0} isSubTotal/>

            <tr className="h-4"><td colSpan={2}></td></tr>

            <ReportRow label="Fluxo de Caixa das Atividades de Investimento" value="" level={0} bold colSpan={2} />
            {variacoes.FCI.detalhe.map(item => <ReportRow key={item.nome} label={item.nome} value={item.variacao} level={1} />)}
            <ReportRow label="(=) Caixa Líquido das Atividades de Investimento (FCI)" value={fci} level={0} isSubTotal/>

            <tr className="h-4"><td colSpan={2}></td></tr>

            <ReportRow label="Fluxo de Caixa das Atividades de Financiamento" value="" level={0} bold colSpan={2} />
             {variacoes.FCF.detalhe.map(item => <ReportRow key={item.nome} label={item.nome} value={item.variacao} level={1} />)}
            <ReportRow label="(=) Caixa Líquido das Atividades de Financiamento (FCF)" value={fcf} level={0} isSubTotal/>
            
            <tr className="h-4"><td colSpan={2}></td></tr>

            <ReportRow label="(=) Aumento (Redução) Líquido de Caixa e Equivalentes" value={fluxoCaixaLiquido} level={0} isTotal/>
            <ReportRow label="(+) Saldo Inicial de Caixa e Equivalentes" value={saldoInicialCaixa} level={0} />
            <ReportRow label="(=) Saldo Final de Caixa e Equivalentes" value={saldoFinalCaixa} level={0} isTotal />
        </tbody>
      </table>
    </div>
  );
};

export default DFC;