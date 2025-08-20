import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Empresa, ContaContabil, TipoConta } from '../types';
import { formatCurrency, getValoresDRE, getVariacoesDFC, calcularSaldos, getMovimentacaoContas, getIndicadoresFinanceiros } from './contabilidadeService';

const addPageHeader = (doc: jsPDF, empresa: Empresa, title: string) => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(empresa.razaoSocial, 14, 15);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 22);
    
    doc.setDrawColor(174, 214, 241); // Pastel Blue
    doc.setLineWidth(0.1);
    doc.line(14, 25, doc.internal.pageSize.width - 14, 25);
    doc.setDrawColor(0, 0, 0); // Reset draw color
    
    return 30; // startY for content
};

const addFooter = (doc: jsPDF) => {
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }
};

const formatRatio = (value: number) => isFinite(value) ? value.toFixed(2) : 'N/A';
const formatPercent = (value: number) => isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'N/A';
const formatDays = (value: number) => isFinite(value) ? `${Math.round(value)} d` : 'N/A';


const addAnaliseFinanceira = (doc: jsPDF, empresa: Empresa, saldos: Map<string, number>, startY: number) => {
    const analise = getIndicadoresFinanceiros(empresa, saldos);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Chave de Desempenho', 14, startY);

    autoTable(doc, {
        startY: startY + 5,
        body: [
            ['Liquidez Corrente', formatRatio(analise.liquidezCorrente), 'ROE (Retorno s/ PL)', formatPercent(analise.ROE)],
            ['Liquidez Seca', formatRatio(analise.liquidezSeca), 'ROA (Retorno s/ Ativo)', formatPercent(analise.ROA)],
            ['Margem Líquida', formatPercent(analise.margemLiquida), 'Margem EBITDA', formatPercent(analise.margemEBITDA)],
            ['Dívida Líq./EBITDA', formatRatio(analise.dividaLiquidaSobreEBITDA), 'Ciclo de Caixa (CCC)', formatDays(analise.CCC)],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [174, 214, 241] }
    });
    
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise Vertical - DRE', 14, currentY);

    const dreBody = [
        ['Receita Bruta', formatPercent(1)],
        ['(-) Deduções', formatPercent(analise.receitaBruta > 0 ? analise.deducoes / analise.receitaBruta : 0)],
        ['(=) Receita Líquida', formatPercent(analise.receitaBruta > 0 ? analise.receitaLiquida / analise.receitaBruta : 0)],
        ['(-) Custos', formatPercent(analise.receitaBruta > 0 ? analise.custos / analise.receitaBruta : 0)],
        ['(=) Lucro Bruto', formatPercent(analise.receitaBruta > 0 ? analise.lucroBruto / analise.receitaBruta : 0)],
        ['(-) Despesas Operacionais', formatPercent(analise.receitaBruta > 0 ? analise.despesasOperacionais / analise.receitaBruta : 0)],
        ['(=) Resultado Líquido', formatPercent(analise.receitaBruta > 0 ? analise.lucroLiquido / analise.receitaBruta : 0)],
    ];
    autoTable(doc, {
        head: [['Descrição', '% da Receita Bruta']],
        body: dreBody,
        theme: 'striped',
        startY: currentY + 5,
        headStyles: { fillColor: [174, 214, 241] },
        columnStyles: { 1: { halign: 'right' } },
        didDrawCell: (data: any) => {
             if (data.section === 'body' && [2, 4, 6].includes(data.row.index)) {
                doc.setFont('helvetica', 'bold');
            }
        }
    });
}

const addDRE = (doc: jsPDF, empresa: Empresa, saldos: Map<string, number>, startY: number) => {
    const lancamentosPeriodo = empresa.lancamentos.filter(l => !l.isDeleted && !l.isEncerramento);
    const saldosBrutos = new Map<string, number>();
     lancamentosPeriodo.forEach(lancamento => {
        if (lancamento.isDeleted) return;
        lancamento.partidas.forEach(partida => {
            const saldoAtual = saldosBrutos.get(partida.contaId) || 0;
            const valor = partida.tipo === 'D' ? partida.valor : -partida.valor;
            saldosBrutos.set(partida.contaId, saldoAtual + valor);
        });
    });
    const dre = getValoresDRE(empresa.planoDeContas, saldosBrutos);


    autoTable(doc, {
        startY,
        head: [['Descrição', 'Valor (R$)']],
        headStyles: { fillColor: [174, 214, 241] },
        body: [
            ['Receita Bruta', formatCurrency(dre.receitaBruta)],
            ['(-) Deduções da Receita Bruta', formatCurrency(dre.deducoes)],
            ['(=) Receita Líquida', formatCurrency(dre.receitaLiquida)],
            ['(-) Custo de Produto/Serviço Vendido', formatCurrency(dre.custos)],
            ['(=) Lucro Bruto', formatCurrency(dre.lucroBruto)],
            ['(-) Despesas Operacionais', formatCurrency(dre.despesasOperacionais)],
            ['(=) Resultado Operacional', formatCurrency(dre.resultadoOperacional)],
            ['(+) Receitas Financeiras', formatCurrency(dre.receitasFinanceiras)],
            ['(-) Despesas Financeiras', formatCurrency(dre.despesasFinanceiras)],
            ['(+/-) Outras Receitas/Despesas', formatCurrency(dre.outrasReceitas - dre.outrasDespesas)],
            ['(=) Resultado Antes do IR/CSLL', formatCurrency(dre.resultadoAntesIR)],
            ['(-) Imposto de Renda e CSLL', formatCurrency(dre.irCsll)],
            ['(=) Resultado Líquido do Exercício', formatCurrency(dre.lucroLiquido)],
        ],
        theme: 'striped',
        columnStyles: { 1: { halign: 'right' } },
        didDrawCell: (data: any) => {
            const boldRows = [2, 4, 6, 10, 12];
            if (data.section === 'body' && boldRows.includes(data.row.index)) {
                doc.setFont('helvetica', 'bold');
            }
        }
    });
};

const addBalancoPatrimonial = (doc: jsPDF, empresa: Empresa, saldos: Map<string, number>, startY: number) => {
    const { planoDeContas } = empresa;
    const body: any[][] = [];
    
    const buildRowsRecursive = (paiId: string | null, level: number) => {
        planoDeContas
            .filter(c => c.paiId === paiId)
            .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
            .forEach(conta => {
                const saldo = saldos.get(conta.id) || 0;
                if (Math.abs(saldo) > 0.01) {
                    const row: any[] = [
                        {
                            content: `${' '.repeat(level * 4)}${conta.codigo} ${conta.nome}`,
                            styles: { fontStyle: conta.tipo === TipoConta.SINTETICA ? 'bold' : 'normal' }
                        },
                        {
                            content: formatCurrency(saldo),
                            styles: { halign: 'right', fontStyle: conta.tipo === TipoConta.SINTETICA ? 'bold' : 'normal' }
                        }
                    ];
                    body.push(row);
                    if (conta.tipo === TipoConta.SINTETICA) {
                        buildRowsRecursive(conta.id, level + 1);
                    }
                }
            });
    };

    const rootContas = planoDeContas.filter(c => !c.paiId).sort((a,b) => a.codigo.localeCompare(b.codigo));
    const ativo = rootContas.find(c => c.codigo === '1');
    const passivo = rootContas.find(c => c.codigo === '2');
    const pl = rootContas.find(c => c.codigo === '3');

    if (ativo) {
        body.push([{ content: `${ativo.codigo} ATIVO`, colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', fillColor: [214, 234, 248] } }]);
        buildRowsRecursive(ativo.id, 1);
        const totalAtivo = saldos.get('1') || 0;
        body.push([{ content: 'TOTAL ATIVO', styles: { halign: 'left', fontStyle: 'bold', fillColor: [174, 214, 241]} }, { content: formatCurrency(totalAtivo), styles: { halign: 'right', fontStyle: 'bold', fillColor: [174, 214, 241] } }]);
    }
    
    body.push([{ content: ' ', colSpan: 2 }]); // Spacer

    if (passivo) {
        body.push([{ content: `${passivo.codigo} PASSIVO`, colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', fillColor: [214, 234, 248] } }]);
        buildRowsRecursive(passivo.id, 1);
    }
    
    if (pl) {
        body.push([{ content: `${pl.codigo} PATRIMÔNIO LÍQUIDO`, colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', fillColor: [214, 234, 248] } }]);
        buildRowsRecursive(pl.id, 1);
    }
    
    const totalPassivoEPL = (saldos.get('2') || 0) + (saldos.get('3') || 0);
    body.push([{ content: 'TOTAL PASSIVO + PL', styles: { halign: 'left', fontStyle: 'bold', fillColor: [174, 214, 241]} }, { content: formatCurrency(totalPassivoEPL), styles: { halign: 'right', fontStyle: 'bold', fillColor: [174, 214, 241] } }]);

    autoTable(doc, {
        startY,
        head: [['Descrição', 'Saldo (R$)']],
        headStyles: { fillColor: [174, 214, 241] },
        body: body,
        theme: 'striped',
        columnStyles: { 1: { halign: 'right' } },
    });
};

const addDFC = (doc: jsPDF, empresa: Empresa, startY: number) => {
    const { planoDeContas, lancamentos } = empresa;
    
    const lancamentosPeriodo = lancamentos.filter(l => !l.isDeleted && !l.isEncerramento);
    const saldosBrutos = new Map<string, number>();
     lancamentosPeriodo.forEach(lancamento => {
        lancamento.partidas.forEach(partida => {
            const saldoAtual = saldosBrutos.get(partida.contaId) || 0;
            const valor = partida.tipo === 'D' ? partida.valor : -partida.valor;
            saldosBrutos.set(partida.contaId, saldoAtual + valor);
        });
    });
    
    const dre = getValoresDRE(planoDeContas, saldosBrutos);
    const variacoes = getVariacoesDFC(planoDeContas, lancamentosPeriodo);

    const despesaDepreciacao = planoDeContas
        .filter(c => c.tipoDRE === 'Despesa Operacional' && c.nome.toLowerCase().includes('depreciação'))
        .reduce((acc, conta) => acc + Math.abs(saldosBrutos.get(conta.id) || 0), 0);

    const fco = dre.lucroLiquido + despesaDepreciacao + variacoes.FCO.total;
    const fci = variacoes.FCI.total;
    const fcf = variacoes.FCF.total;

    const fluxoCaixaLiquido = fco + fci + fcf;
    
    const saldosFinais = calcularSaldos(planoDeContas, lancamentos.filter(l => !l.isDeleted));
    const saldoFinalCaixa = saldosFinais.get('1.1.1') || 0;
    const saldoInicialCaixa = saldoFinalCaixa - fluxoCaixaLiquido;
    
    const body: any[] = [
        [{ content: 'Fluxo de Caixa das Atividades Operacionais', colSpan: 2, styles: { fontStyle: 'bold' } }],
        ['  Lucro Líquido do Exercício', formatCurrency(dre.lucroLiquido)],
        ['  Ajustes por:', ''],
        ['    (+) Depreciação', formatCurrency(despesaDepreciacao)],
        ...variacoes.FCO.detalhe.map(item => [`    ${item.nome}`, formatCurrency(item.variacao)]),
        [{ content: '(=) Caixa Gerado nas Operações', styles: { fontStyle: 'bold' }}, { content: formatCurrency(fco), styles: { fontStyle: 'bold' }}],
        
        [{ content: ' ', colSpan: 2 }],

        [{ content: 'Fluxo de Caixa das Atividades de Investimento', colSpan: 2, styles: { fontStyle: 'bold' } }],
         ...variacoes.FCI.detalhe.map(item => [`  ${item.nome}`, formatCurrency(item.variacao)]),
        [{ content: '(=) Caixa Usado em Investimentos', styles: { fontStyle: 'bold' }}, { content: formatCurrency(fci), styles: { fontStyle: 'bold' }}],
        
        [{ content: ' ', colSpan: 2 }],

        [{ content: 'Fluxo de Caixa das Atividades de Financiamento', colSpan: 2, styles: { fontStyle: 'bold' } }],
        ...variacoes.FCF.detalhe.map(item => [`  ${item.nome}`, formatCurrency(item.variacao)]),
        [{ content: '(=) Caixa Gerado em Financiamentos', styles: { fontStyle: 'bold' }}, { content: formatCurrency(fcf), styles: { fontStyle: 'bold' }}],
        
        [{ content: ' ', colSpan: 2 }],

        [{ content: '(=) Aumento (Redução) Líquido de Caixa', styles: { fontStyle: 'bold' }}, { content: formatCurrency(fluxoCaixaLiquido), styles: { fontStyle: 'bold' }}],
        ['(+) Saldo Inicial de Caixa e Equivalentes', formatCurrency(saldoInicialCaixa)],
        [{ content: '(=) Saldo Final de Caixa e Equivalentes', styles: { fontStyle: 'bold' }}, { content: formatCurrency(saldoFinalCaixa), styles: { fontStyle: 'bold' }}],
    ];

    autoTable(doc, {
        startY,
        head: [['Descrição', 'Valor (R$)']],
        headStyles: { fillColor: [174, 214, 241] },
        body,
        theme: 'striped',
        columnStyles: { 1: { halign: 'right' } },
    });
};

const addDMPL = (doc: jsPDF, empresa: Empresa, startY: number) => {
    const { planoDeContas, lancamentos } = empresa;

    const lancamentosPeriodo = lancamentos.filter(l => !l.isDeleted && !l.isEncerramento);
    const saldosBrutosPeriodo = new Map<string, number>();
    lancamentosPeriodo.forEach(l => {
        l.partidas.forEach(p => {
            const saldoAtual = saldosBrutosPeriodo.get(p.contaId) || 0;
            const valor = p.tipo === 'D' ? p.valor : -p.valor;
            saldosBrutosPeriodo.set(p.contaId, saldoAtual + valor);
        });
    });
    
    const saldosFinais = calcularSaldos(planoDeContas, lancamentos.filter(l => !l.isDeleted));

    const resultadoExercicio = getValoresDRE(planoDeContas, saldosBrutosPeriodo).lucroLiquido;
    const movCapitalSocial = getMovimentacaoContas('3.1', planoDeContas, lancamentosPeriodo);

    const aumentoCapital = movCapitalSocial.totalCreditos - movCapitalSocial.totalDebitos;
    const saldoFinalCapital = saldosFinais.get('3.1') || 0;
    const saldoInicialCapital = saldoFinalCapital - aumentoCapital;

    const saldoFinalLucros = saldosFinais.get('3.2.1.01') || 0;
    const saldoInicialLucros = saldoFinalLucros - resultadoExercicio;
    
    const saldoInicialTotal = saldoInicialCapital + saldoInicialLucros;
    const saldoFinalTotal = saldoFinalCapital + saldoFinalLucros;


    autoTable(doc, {
        startY,
        head: [['Descrição', 'Capital Social', 'Lucros/Prejuízos Acumulados', 'Total']],
        body: [
            ['Saldos Iniciais', formatCurrency(saldoInicialCapital), formatCurrency(saldoInicialLucros), formatCurrency(saldoInicialTotal)],
            ['Aumento de Capital', formatCurrency(aumentoCapital), formatCurrency(0), formatCurrency(aumentoCapital)],
            ['Lucro Líquido do Exercício', formatCurrency(0), formatCurrency(resultadoExercicio), formatCurrency(resultadoExercicio)],
        ],
        foot: [
            ['Saldos Finais', formatCurrency(saldoFinalCapital), formatCurrency(saldoFinalLucros), formatCurrency(saldoFinalTotal)],
        ],
        theme: 'striped',
        headStyles: { halign: 'center', fontStyle: 'bold', fillColor: [174, 214, 241] },
        footStyles: { halign: 'center', fontStyle: 'bold', fillColor: [174, 214, 241] },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
    });
}

export async function exportarRelatoriosPDF(empresa: Empresa) {
    const doc = new jsPDF();
    // Start with a clean slate of pages
    doc.deletePage(1);
    let startY;

    const saldosBalanco = calcularSaldos(empresa.planoDeContas, empresa.lancamentos.filter(l => !l.isDeleted));

    // Análise Financeira
    doc.addPage();
    startY = addPageHeader(doc, empresa, 'Análise Financeira e de Indicadores');
    addAnaliseFinanceira(doc, empresa, saldosBalanco, startY);

    // DRE
    doc.addPage();
    startY = addPageHeader(doc, empresa, 'Demonstração do Resultado do Exercício (DRE)');
    addDRE(doc, empresa, new Map(), startY); // Pass empty map, it calculates its own balances

    // Balanço Patrimonial
    doc.addPage();
    startY = addPageHeader(doc, empresa, 'Balanço Patrimonial (BP)');
    addBalancoPatrimonial(doc, empresa, saldosBalanco, startY);

    // DFC
    doc.addPage();
    startY = addPageHeader(doc, empresa, 'Demonstração dos Fluxos de Caixa (DFC)');
    addDFC(doc, empresa, startY);

    // DMPL
    doc.addPage();
    startY = addPageHeader(doc, empresa, 'Demonstração das Mutações do Patrimônio Líquido (DMPL)');
    addDMPL(doc, empresa, startY);

    addFooter(doc);
    doc.save(`Relatorios_Contabeis_${empresa.nomeFantasia.replace(/\s/g, '_')}.pdf`);
}