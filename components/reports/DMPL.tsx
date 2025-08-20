import React, { useMemo } from 'react';
import { Empresa, LancamentoContabil } from '../../types';
import { formatCurrency, getValoresDRE, getMovimentacaoContas } from '../../services/contabilidadeService';

interface Props {
    empresa: Empresa;
    saldos: Map<string, number>;
    lancamentosPeriodo: LancamentoContabil[];
}

const DMPL: React.FC<Props> = ({ empresa, saldos, lancamentosPeriodo }) => {
    const { planoDeContas } = empresa;

    const capitalSocialConta = useMemo(() => planoDeContas.find(c => c.codigo === '3.1'), [planoDeContas]);
    const lucrosAcumuladosConta = useMemo(() => planoDeContas.find(c => c.codigo === '3.2.1.01'), [planoDeContas]);

    const resultadoExercicio = useMemo(() => {
        // Recalculate DRE based on raw period movements for accuracy
        const saldosBrutosPeriodo = new Map<string, number>();
        lancamentosPeriodo.forEach(lancamento => {
            lancamento.partidas.forEach(partida => {
                const saldoAtual = saldosBrutosPeriodo.get(partida.contaId) || 0;
                const valor = partida.tipo === 'D' ? partida.valor : -partida.valor;
                saldosBrutosPeriodo.set(partida.contaId, saldoAtual + valor);
            });
        });
        return getValoresDRE(planoDeContas, saldosBrutosPeriodo).lucroLiquido;
    }, [planoDeContas, lancamentosPeriodo]);

    const movCapitalSocial = useMemo(() => 
        capitalSocialConta ? getMovimentacaoContas(capitalSocialConta.id, planoDeContas, lancamentosPeriodo) : { totalDebitos: 0, totalCreditos: 0, netChange: 0 }, 
        [planoDeContas, lancamentosPeriodo, capitalSocialConta]);

    // Simplificação: Saldo inicial é o saldo final menos as movimentações do período
    const aumentoCapital = movCapitalSocial.totalCreditos - movCapitalSocial.totalDebitos;
    const saldoFinalCapital = capitalSocialConta ? saldos.get(capitalSocialConta.id) || 0 : 0;
    const saldoInicialCapital = saldoFinalCapital - aumentoCapital;

    const saldoFinalLucros = lucrosAcumuladosConta ? saldos.get(lucrosAcumuladosConta.id) || 0 : 0;
    // Saldo Inicial = Saldo Final (que já inclui o resultado) - Resultado do Período (assumindo que não há outras mutações como dividendos)
    const saldoInicialLucros = saldoFinalLucros - resultadoExercicio;

    const saldoInicialTotal = saldoInicialCapital + saldoInicialLucros;
    const saldoFinalTotal = saldoFinalCapital + saldoFinalLucros;

    return (
        <div id="dmpl">
            <h3 className="text-xl font-semibold mb-4 text-center text-black">Demonstração das Mutações do Patrimônio Líquido</h3>
            <p className="text-center text-black mb-2">{empresa.razaoSocial}</p>
            <p className="text-center text-sm text-black mb-6">Período Findo em 31/12/XXXX</p>
            <div className="overflow-x-auto">
                 <table className="min-w-full bg-white text-sm">
                    <thead>
                        <tr className="bg-blue-50">
                            <th className="py-2 px-3 text-left font-semibold text-black">Descrição</th>
                            <th className="py-2 px-3 text-right font-semibold text-black">Capital Social</th>
                            <th className="py-2 px-3 text-right font-semibold text-black">Lucros/Prejuízos Acumulados</th>
                            <th className="py-2 px-3 text-right font-semibold text-black">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-200 text-black">
                        <tr className="border-b">
                            <td className="py-2 px-3 font-semibold">Saldos Iniciais</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(saldoInicialCapital)}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(saldoInicialLucros)}</td>
                            <td className="py-2 px-3 text-right font-semibold font-mono">{formatCurrency(saldoInicialTotal)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-3">Aumento de Capital</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(aumentoCapital)}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(0)}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(aumentoCapital)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-3">Lucro Líquido do Exercício</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(0)}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(resultadoExercicio)}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(resultadoExercicio)}</td>
                        </tr>
                        {/* Outras mutações como dividendos podem ser adicionadas aqui */}
                    </tbody>
                     <tfoot className="bg-blue-100 font-bold text-black">
                        <tr>
                             <td className="py-2 px-3">Saldos Finais</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(saldoFinalCapital)}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(saldoFinalLucros)}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(saldoFinalTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default DMPL;