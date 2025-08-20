import React, { useMemo } from 'react';
import { Empresa } from '../../types';
import ReportRow from './ReportRow';
import { getValoresDRE } from '../../services/contabilidadeService';

interface Props {
    empresa: Empresa;
    saldos: Map<string, number>;
}

const DRE: React.FC<Props> = ({ empresa, saldos }) => {
    const dre = useMemo(() => {
        const lancamentosPeriodo = empresa.lancamentos.filter(l => !l.isDeleted && !l.isEncerramento);
        // DRE must always be calculated on the raw balances of the period's movements.
        const saldosBrutos = new Map<string, number>();
         lancamentosPeriodo.forEach(lancamento => {
            if (lancamento.isDeleted) return;
            lancamento.partidas.forEach(partida => {
                const saldoAtual = saldosBrutos.get(partida.contaId) || 0;
                const valor = partida.tipo === 'D' ? partida.valor : -partida.valor;
                saldosBrutos.set(partida.contaId, saldoAtual + valor);
            });
        });
        return getValoresDRE(empresa.planoDeContas, saldosBrutos)
    }, [empresa, saldos]);

    return (
        <div id="dre">
            <h3 className="text-xl font-semibold mb-4 text-center text-black">Demonstração do Resultado do Exercício</h3>
            <p className="text-center text-black mb-2">{empresa.razaoSocial}</p>
            <p className="text-center text-sm text-black mb-6">Período Findo em 31/12/XXXX</p>
             <table className="min-w-full bg-white">
                 <thead>
                    <tr>
                        <th className="py-2 px-4 bg-blue-50 text-left text-sm font-semibold text-black">Descrição</th>
                        <th className="py-2 px-4 bg-blue-50 text-right text-sm font-semibold text-black">Valor</th>
                    </tr>
                </thead>
                <tbody className="text-black">
                    <ReportRow label="Receita Operacional Bruta" value={dre.receitaBruta} level={0} />
                    <ReportRow label="(-) Deduções da Receita Bruta" value={dre.deducoes} level={0} />
                    <ReportRow label="(=) Receita Operacional Líquida" value={dre.receitaLiquida} level={0} isSubTotal/>
                    <ReportRow label="(-) Custo de Produto/Serviço Vendido" value={dre.custos} level={0} />
                    <ReportRow label="(=) Lucro Bruto" value={dre.lucroBruto} level={0} isSubTotal/>
                    <ReportRow label="(-) Despesas Operacionais" value={dre.despesasOperacionais} level={0} />
                    <ReportRow label="(=) Resultado Operacional" value={dre.resultadoOperacional} level={0} isSubTotal/>
                    <ReportRow label="(+) Receitas Financeiras" value={dre.receitasFinanceiras} level={0} />
                    <ReportRow label="(-) Despesas Financeiras" value={dre.despesasFinanceiras} level={0} />
                    <ReportRow label="(+/-) Outras Receitas/Despesas" value={dre.outrasReceitas - dre.outrasDespesas} level={0} />
                    <ReportRow label="(=) Resultado Antes do IR/CSLL" value={dre.resultadoAntesIR} level={0} isSubTotal/>
                    <ReportRow label="(-) Imposto de Renda e CSLL" value={dre.irCsll} level={0} />
                    <ReportRow label="(=) Resultado Líquido do Exercício" value={dre.lucroLiquido} level={0} isTotal/>
                </tbody>
            </table>
        </div>
    );
};

export default DRE;