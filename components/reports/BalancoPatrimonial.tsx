
import React from 'react';
import { Empresa, ContaContabil, TipoConta } from '../../types';
import { formatCurrency } from '../../services/contabilidadeService';
import ReportRow from './ReportRow';

interface Props {
    empresa: Empresa;
    saldos: Map<string, number>;
}

// Este componente auxiliar renderiza apenas os filhos de um determinado pai.
const RenderChildContas: React.FC<{
    paiId: string;
    planoDeContas: ContaContabil[];
    saldos: Map<string, number>;
    level: number;
}> = ({ paiId, planoDeContas, saldos, level }) => {
    const children = planoDeContas
        .filter(c => c.paiId === paiId)
        .sort((a,b) => a.codigo.localeCompare(b.codigo));

    return (
        <>
            {children.map(conta => {
                const saldo = saldos.get(conta.id) || 0;
                // Como os saldos são agregados, se uma conta sintética tem saldo zero,
                // significa que nenhum de seus filhos tem saldo, então podemos pular a renderização.
                if (Math.abs(saldo) < 0.01) return null;

                return (
                    <React.Fragment key={conta.id}>
                        <ReportRow 
                            label={`${conta.codigo} ${conta.nome}`} 
                            value={saldo} 
                            level={level}
                            bold={conta.tipo === TipoConta.SINTETICA}
                        />
                        {/* Se o filho também for sintético, faz a recursão para renderizar seus filhos */}
                        {conta.tipo === TipoConta.SINTETICA && (
                            <RenderChildContas
                                paiId={conta.id}
                                planoDeContas={planoDeContas}
                                saldos={saldos}
                                level={level + 1}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};


const BalancoPatrimonial: React.FC<Props> = ({ empresa, saldos }) => {
    const { planoDeContas } = empresa;

    const getConta = (codigo: string) => planoDeContas.find(c => c.codigo === codigo);

    const ativo = getConta('1');
    const passivo = getConta('2');
    const pl = getConta('3');

    // Obter totais do mapa de saldos
    const totalAtivo = ativo ? saldos.get(ativo.id) || 0 : 0;
    const totalPassivo = passivo ? saldos.get(passivo.id) || 0 : 0;
    const totalPL = pl ? saldos.get(pl.id) || 0 : 0;
    const totalPassivoEPL = totalPassivo + totalPL;
    
    const diferenca = totalAtivo - totalPassivoEPL;

    return (
        <div id="balanco-patrimonial">
            <h3 className="text-xl font-semibold mb-4 text-center text-black">Balanço Patrimonial</h3>
            <p className="text-center text-black mb-2">{empresa.razaoSocial}</p>
            <p className="text-center text-sm text-black mb-6">Em 31/12/XXXX</p>
            <table className="min-w-full bg-white">
                <thead>
                    <tr>
                        <th className="py-2 px-4 bg-blue-50 text-left text-sm font-semibold text-black">Descrição</th>
                        <th className="py-2 px-4 bg-blue-50 text-right text-sm font-semibold text-black">Saldo</th>
                    </tr>
                </thead>
                <tbody className="text-black">
                    {/* --- ATIVO --- */}
                    {ativo && (
                        <>
                            <ReportRow label={`${ativo.codigo} ${ativo.nome}`} value={""} level={0} bold className="bg-blue-200" />
                            <RenderChildContas paiId={ativo.id} planoDeContas={planoDeContas} saldos={saldos} level={1} />
                            <ReportRow label={`TOTAL ${ativo.nome}`} value={totalAtivo} level={0} isTotal />
                        </>
                    )}
                    
                    <tr className="h-4"><td colSpan={2}></td></tr>

                    {/* --- PASSIVO --- */}
                    {passivo && (
                        <>
                            <ReportRow label={`${passivo.codigo} ${passivo.nome}`} value={""} level={0} bold className="bg-blue-200" />
                            <RenderChildContas paiId={passivo.id} planoDeContas={planoDeContas} saldos={saldos} level={1} />
                            <ReportRow label={`TOTAL ${passivo.nome}`} value={totalPassivo} level={0} isSubTotal />
                        </>
                    )}
                    
                    <tr className="h-2"><td colSpan={2}></td></tr>

                    {/* --- PATRIMÔNIO LÍQUIDO --- */}
                    {pl && (
                        <>
                            <ReportRow label={`${pl.codigo} ${pl.nome}`} value={""} level={0} bold className="bg-blue-200" />
                            <RenderChildContas paiId={pl.id} planoDeContas={planoDeContas} saldos={saldos} level={1} />
                            <ReportRow label={`TOTAL ${pl.nome}`} value={totalPL} level={0} isSubTotal />
                        </>
                    )}

                    <tr className="h-4"><td colSpan={2}></td></tr>
                    
                    <ReportRow label="TOTAL PASSIVO + PATRIMÔNIO LÍQUIDO" value={totalPassivoEPL} level={0} isTotal/>
                </tbody>
                <tfoot className="border-t-2 border-blue-300">
                    <tr className={`font-bold text-black ${Math.abs(diferenca) < 0.01 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        <td className="py-2 px-4">Verificação (Ativo - (Passivo + PL))</td>
                        <td className="py-2 px-4 text-right font-mono">{formatCurrency(diferenca)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default BalancoPatrimonial;