import React, { useMemo, useState } from 'react';
import { Empresa, NaturezaConta, TipoConta } from '../../types';
import { Card, Input } from '../ui';
import ReportRow from './ReportRow';
import { getIndicadoresFinanceiros, formatCurrency, calcularSaldos } from '../../services/contabilidadeService';
import { TrendingUpIcon, BanknotesIcon, ClockIcon, ArrowsRightLeftIcon, ScaleIcon, ChartBarIcon, DocumentTextIcon } from '../ui/Icons';
import { AnalysisGroupChart } from './AnalysisGroupChart';
import { BarChart } from './BarChart';

const formatRatio = (value: number) => isFinite(value) ? value.toFixed(2) : 'N/A';
const formatPercent = (value: number) => isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'N/A';
const formatDays = (value: number) => isFinite(value) ? `${Math.round(value)} d` : 'N/A';

interface KpiCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon }) => (
    <div className="text-center p-4 bg-blue-50 rounded-lg shadow-sm">
        <Icon className="h-8 w-8 text-black mx-auto mb-2" />
        <dt className="text-sm font-medium text-black truncate">{title}</dt>
        <dd className="mt-1 text-2xl font-semibold text-black">{value}</dd>
    </div>
);

interface Props {
    empresa: Empresa;
    saldos: Map<string, number>; // Expects saldosBalanco for indicators
}

const AnaliseFinanceira: React.FC<Props> = ({ empresa, saldos }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const analiseData = useMemo(() => {
        if (!empresa) return null;
        // The main 'saldos' prop should be the one for the balance sheet to calculate correct indicators.
        return getIndicadoresFinanceiros(empresa, saldos);
    }, [empresa, saldos]);

    const monthlyAnalysis = useMemo(() => {
        if (!empresa) return { topReceitas: [], topDespesas: [] };
        
        const monthlyLancamentos = empresa.lancamentos.filter(l => !l.isDeleted && l.data.startsWith(selectedMonth));
        if (monthlyLancamentos.length === 0) {
            return { topReceitas: [], topDespesas: [] };
        }
        
        const monthlySaldos = calcularSaldos(empresa.planoDeContas, monthlyLancamentos);

        const revenueGroups = new Map<string, { name: string; value: number }>();
        const expenseGroups = new Map<string, { name: string; value: number }>();

        empresa.planoDeContas.forEach(conta => {
            if (conta.tipo === TipoConta.ANALITICA) {
                const saldo = Math.abs(monthlySaldos.get(conta.id) || 0);
                if (saldo > 0.001 && conta.paiId) {
                    const parent = empresa.planoDeContas.find(p => p.id === conta.paiId);
                    if (parent && parent.tipo === TipoConta.SINTETICA) { // Garante que o pai é sintético
                        if (conta.natureza === NaturezaConta.RECEITA) {
                            const group = revenueGroups.get(parent.id) || { name: parent.nome, value: 0 };
                            // Contas redutoras diminuem o valor do grupo
                            group.value += conta.isRedutora ? -saldo : saldo;
                            revenueGroups.set(parent.id, group);
                        } else if ([NaturezaConta.DESPESA, NaturezaConta.CUSTO].includes(conta.natureza)) {
                            const group = expenseGroups.get(parent.id) || { name: parent.nome, value: 0 };
                            group.value += saldo;
                            expenseGroups.set(parent.id, group);
                        }
                    }
                }
            }
        });

        const topReceitas = Array.from(revenueGroups.values()).filter(g => g.value > 0).sort((a, b) => b.value - a.value);
        const topDespesas = Array.from(expenseGroups.values()).filter(g => g.value > 0).sort((a, b) => b.value - a.value);

        return { topReceitas, topDespesas };

    }, [empresa, selectedMonth]);


    if (!analiseData) {
        return <p>Calculando dados de análise...</p>;
    }

    const { dupont } = analiseData;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-semibold mb-4 text-center text-black">Visão Geral Executiva</h3>
                <p className="text-center text-black mb-2">{empresa.razaoSocial}</p>
                <p className="text-center text-sm text-black mb-6">Análise Consolidada do Período</p>
            </div>
            
            <Card className="p-6">
                <h4 className="text-lg font-semibold text-black mb-4">Indicadores Chave de Desempenho (Período)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    <KpiCard title="Receita Líquida" value={formatCurrency(analiseData.receitaLiquida)} icon={ChartBarIcon} />
                    <KpiCard title="Lucro Líquido" value={formatCurrency(analiseData.lucroLiquido)} icon={ChartBarIcon} />
                    <KpiCard title="EBITDA" value={formatCurrency(analiseData.ebitda)} icon={ChartBarIcon} />
                    <KpiCard title="Margem Líquida" value={formatPercent(analiseData.margemLiquida)} icon={TrendingUpIcon} />
                    <KpiCard title="ROE" value={formatPercent(analiseData.ROE)} icon={TrendingUpIcon} />
                    <KpiCard title="ROA" value={formatPercent(analiseData.ROA)} icon={TrendingUpIcon} />
                    <KpiCard title="Liquidez Corrente" value={formatRatio(analiseData.liquidezCorrente)} icon={BanknotesIcon} />
                    <KpiCard title="Dívida Liq./EBITDA" value={formatRatio(analiseData.dividaLiquidaSobreEBITDA)} icon={BanknotesIcon} />
                    <KpiCard title="PMR (Receb.)" value={formatDays(analiseData.DSO_PMR)} icon={ClockIcon} />
                    <KpiCard title="PMP (Pag.)" value={formatDays(analiseData.DPO_PMP)} icon={ClockIcon} />
                    <KpiCard title="PME (Est.)" value={formatDays(analiseData.DIO_PME)} icon={ClockIcon} />
                    <KpiCard title="Ciclo de Caixa (CCC)" value={formatDays(analiseData.CCC)} icon={ArrowsRightLeftIcon} />
                </div>
            </Card>

            <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between no-print">
                <h4 className="text-lg font-semibold text-black">Análise Mensal Detalhada</h4>
                <Input
                    type="month"
                    aria-label="Selecionar mês para análise"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-48 bg-white"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <AnalysisGroupChart 
                    title="Análise de Receitas por Subgrupos"
                    data={monthlyAnalysis.topReceitas}
                    icon={DocumentTextIcon}
                    barColorClass="bg-emerald-500"
                    valueColorClass="text-black"
                />
                <AnalysisGroupChart 
                    title="Top Grupos de Despesas"
                    data={monthlyAnalysis.topDespesas}
                    icon={TrendingUpIcon}
                    barColorClass="bg-blue-500"
                    valueColorClass="text-rose-600"
                />
            </div>
             <BarChart 
                title="Despesas por Grupo"
                data={monthlyAnalysis.topDespesas.slice(0, 5).map(d => ({label: d.name.split(' ').slice(0,2).join(' '), value: d.value}))}
            />
            
            <Card className="p-6">
                <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2"><ScaleIcon className="h-6 w-6"/> Análise DuPont (Período)</h4>
                 <div className="flex flex-col md:flex-row items-center justify-center text-center space-y-4 md:space-y-0 md:space-x-4">
                    <div className="p-4 bg-blue-100 rounded-lg">
                        <div className="text-sm font-medium text-black">Margem Líquida</div>
                        <div className="text-xl font-bold text-black">{formatPercent(dupont.margemLiquida)}</div>
                    </div>
                    <div className="text-2xl font-light text-black">×</div>
                    <div className="p-4 bg-blue-100 rounded-lg">
                        <div className="text-sm font-medium text-black">Giro do Ativo</div>
                        <div className="text-xl font-bold text-black">{formatRatio(dupont.giroDoAtivo)}</div>
                    </div>
                    <div className="text-2xl font-light text-black">×</div>
                     <div className="p-4 bg-blue-100 rounded-lg">
                        <div className="text-sm font-medium text-black">Alavancagem</div>
                        <div className="text-xl font-bold text-black">{formatRatio(dupont.alavancagemFinanceira)}</div>
                    </div>
                    <div className="text-2xl font-light text-black">=</div>
                     <div className="p-4 bg-blue-200 rounded-lg">
                        <div className="text-sm font-medium text-black">ROE</div>
                        <div className="text-xl font-bold text-black">{formatPercent(dupont.roeCalculado)}</div>
                    </div>
                 </div>
            </Card>

            <Card className="p-6">
                <h4 className="text-lg font-semibold text-black mb-4">Análise Vertical da DRE (Período)</h4>
                <p className="text-sm text-black mb-4">Cada item como um percentual da Receita Bruta.</p>
                <table className="min-w-full bg-white">
                    <tbody className="text-black">
                        <ReportRow label="Receita Bruta" value={formatPercent(1)} level={0}/>
                        <ReportRow label="(-) Deduções" value={formatPercent(analiseData.receitaBruta > 0 ? analiseData.deducoes / analiseData.receitaBruta : 0)} level={0}/>
                        <ReportRow label="(=) Receita Líquida" value={formatPercent(analiseData.receitaBruta > 0 ? analiseData.receitaLiquida / analiseData.receitaBruta : 0)} level={0} isSubTotal/>
                        <ReportRow label="(-) Custos" value={formatPercent(analiseData.receitaBruta > 0 ? analiseData.custos / analiseData.receitaBruta : 0)} level={0}/>
                        <ReportRow label="(=) Lucro Bruto" value={formatPercent(analiseData.receitaBruta > 0 ? analiseData.lucroBruto / analiseData.receitaBruta : 0)} level={0} isSubTotal/>
                        <ReportRow label="(-) Despesas Operacionais" value={formatPercent(analiseData.receitaBruta > 0 ? analiseData.despesasOperacionais / analiseData.receitaBruta : 0)} level={0}/>
                        <ReportRow label="(=) Resultado Líquido" value={formatPercent(analiseData.receitaBruta > 0 ? analiseData.lucroLiquido / analiseData.receitaBruta : 0)} level={0} isTotal/>
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default AnaliseFinanceira;