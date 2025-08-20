import { ContaContabil, LancamentoContabil, NaturezaConta, SaldosConta, MovimentacaoConta, Empresa, TipoConta, TipoDRE, TipoDFC } from '../types';

/**
 * Calculates the raw Debit - Credit balances for a given set of accounts and entries.
 * This serves as a reusable internal "single source of truth".
 * @returns A Map where key is account ID and value is the raw (Debit - Credit) balance.
 */
function calcularSaldosBrutos(planoDeContas: ContaContabil[], lancamentos: LancamentoContabil[]): Map<string, number> {
    const saldosBrutos = new Map<string, number>();
    planoDeContas.forEach(c => saldosBrutos.set(c.id, 0));

    lancamentos.forEach(lancamento => {
        // The caller is responsible for filtering (e.g., by isDeleted)
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


export function getValoresDRE(planoDeContas: ContaContabil[], saldosBrutos: Map<string, number>) {
    // Expects 'saldosBrutos' to be the raw (Debit - Credit) map.
    // Standard Revenues will have negative balances; Deductions, Expenses, & Costs will have positive balances.
    const dre = {
        receitaBruta: 0,
        deducoes: 0,
        custos: 0,
        despesasOperacionais: 0,
        receitasFinanceiras: 0,
        despesasFinanceiras: 0,
        outrasReceitas: 0,
        outrasDespesas: 0,
        irCsll: 0,
    };

    planoDeContas.forEach(conta => {
        if (conta.tipo === TipoConta.ANALITICA && conta.tipoDRE) {
            const saldo = saldosBrutos.get(conta.id) || 0;
            let valorEfetivo = saldo;

            // Standard revenues have a credit nature, so their raw D-C balance is negative.
            // For the DRE formula (Revenue - Cost), we need the revenue amount as a positive number.
            if (conta.natureza === NaturezaConta.RECEITA && !conta.isRedutora) {
                valorEfetivo *= -1;
            }
            // All other accounts (Deductions, Costs, Expenses) have a natural debit balance,
            // so their raw D-C balance is already a positive number, which is what we need to subtract.
            
            switch (conta.tipoDRE) {
                case TipoDRE.RECEITA_BRUTA: dre.receitaBruta += valorEfetivo; break;
                case TipoDRE.DEDUCAO_RECEITA: dre.deducoes += valorEfetivo; break;
                case TipoDRE.CUSTO_PRODUTO_SERVICO: dre.custos += valorEfetivo; break;
                case TipoDRE.DESPESA_OPERACIONAL: dre.despesasOperacionais += valorEfetivo; break;
                case TipoDRE.RECEITA_FINANCEIRA: dre.receitasFinanceiras += valorEfetivo; break;
                case TipoDRE.DESPESA_FINANCEIRA: dre.despesasFinanceiras += valorEfetivo; break;
                case TipoDRE.OUTRAS_RECEITAS: dre.outrasReceitas += valorEfetivo; break;
                case TipoDRE.OUTRAS_DESPESAS: dre.outrasDespesas += valorEfetivo; break;
                case TipoDRE.IR_CSLL: dre.irCsll += valorEfetivo; break;
            }
        }
    });

    const receitaLiquida = dre.receitaBruta - dre.deducoes;
    const lucroBruto = receitaLiquida - dre.custos;
    const resultadoOperacional = lucroBruto - dre.despesasOperacionais;
    const resultadoAntesIR = resultadoOperacional + dre.receitasFinanceiras - dre.despesasFinanceiras + dre.outrasReceitas - dre.outrasDespesas;
    const lucroLiquido = resultadoAntesIR - dre.irCsll;

    return { ...dre, receitaLiquida, lucroBruto, resultadoOperacional, resultadoAntesIR, lucroLiquido };
}


export function calcularSaldos(
  planoDeContas: ContaContabil[],
  lancamentos: LancamentoContabil[] // Expects all non-deleted lancamentos for a BP
): Map<string, number> {
  
  // Step 1: Create presentation map and initialize analytical accounts from raw balances
  const saldosApresentacao = new Map<string, number>();
  const saldosBrutosTotais = calcularSaldosBrutos(planoDeContas, lancamentos);

  planoDeContas.forEach(conta => {
    if (conta.tipo === TipoConta.ANALITICA) {
      const saldoBruto = saldosBrutosTotais.get(conta.id) || 0;
      let saldoFinal = saldoBruto;
      
      // Flip sign for presentation on normal credit accounts. Contra-accounts keep their sign.
      const isNormalCreditNature = [NaturezaConta.PASSIVO, NaturezaConta.PL, NaturezaConta.RECEITA].includes(conta.natureza);
      if (isNormalCreditNature && !conta.isRedutora) {
        saldoFinal *= -1;
      }
      
      saldosApresentacao.set(conta.id, saldoFinal);
    } else {
      saldosApresentacao.set(conta.id, 0);
    }
  });

  // Step 2: If the period is unclosed, calculate the P&L and add it to equity.
  // This is the key step to make the BP balance before formal closing entries.
  const isFechado = lancamentos.some(l => l.isEncerramento);
  if (!isFechado) {
    const lancamentosPeriodo = lancamentos.filter(l => !l.isEncerramento);
    const saldosBrutosPeriodo = calcularSaldosBrutos(planoDeContas, lancamentosPeriodo);
    const dreValues = getValoresDRE(planoDeContas, saldosBrutosPeriodo);
    const lucroLiquidoPeriodo = dreValues.lucroLiquido;
    
    // Add result to "Lucros Acumulados"
    const lucrosAccount = planoDeContas.find(c => c.codigo === '3.2.1.01');
    if (lucrosAccount) {
      const saldoAtual = saldosApresentacao.get(lucrosAccount.id) || 0;
      saldosApresentacao.set(lucrosAccount.id, saldoAtual + lucroLiquidoPeriodo);
    }
  }

  // Step 3: Aggregate balances from children to parents in a deterministic, bottom-up order.
  const idToContaMap = new Map(planoDeContas.map(c => [c.id, c]));

  // Create a sorted list of accounts, from deepest to shallowest.
  const contasPorProfundidade = planoDeContas
    .map(conta => {
      let profundidade = 0;
      let current = conta;
      while (current.paiId) {
        const pai = idToContaMap.get(current.paiId);
        // Safety break for circular dependencies or orphaned accounts
        if (!pai || profundidade > 50) { 
            profundidade = 999; // Put malformed accounts last to avoid breaking the logic
            break;
        }
        current = pai;
        profundidade++;
      }
      return { ...conta, profundidade };
    })
    .sort((a, b) => b.profundidade - a.profundidade); // Sort deepest first

  // Iterate through the sorted accounts (deepest first) and add each account's balance to its parent.
  // This ensures that when a parent is processed, all of its descendants have already been processed.
  contasPorProfundidade.forEach(conta => {
    if (conta.paiId) {
      const saldoFilho = saldosApresentacao.get(conta.id) || 0;
      const saldoPaiAtual = saldosApresentacao.get(conta.paiId) || 0;
      saldosApresentacao.set(conta.paiId, saldoPaiAtual + saldoFilho);
    }
  });
  
  return saldosApresentacao;
}


export function getSaldoConta(
    contaId: string,
    lancamentos: LancamentoContabil[],
    planoDeContas: ContaContabil[]
): SaldosConta {
    const conta = planoDeContas.find(c => c.id === contaId);
    let totalDebitos = 0;
    let totalCreditos = 0;

    lancamentos.forEach(l => {
        if (l.isDeleted) return;
        l.partidas.forEach(p => {
            if (p.contaId === contaId) {
                if(p.tipo === 'D') totalDebitos += p.valor;
                if(p.tipo === 'C') totalCreditos += p.valor;
            }
        });
    });
    
    let saldoFinal = 0;
    if (conta) {
        let hasDebitNature = [NaturezaConta.ATIVO, NaturezaConta.DESPESA, NaturezaConta.CUSTO].includes(conta.natureza);
        if (conta.isRedutora) {
            hasDebitNature = !hasDebitNature;
        }

        if(hasDebitNature) {
            saldoFinal = totalDebitos - totalCreditos;
        } else {
            saldoFinal = totalCreditos - totalDebitos;
        }
    }

    return {
        saldoInicial: 0, // Simplified for this example
        totalDebitos,
        totalCreditos,
        saldoFinal
    };
}

export const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'R$ 0,00';
    const val = Math.abs(value);
    const formatted = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return value < -0.001 ? `(${formatted})` : formatted;
};

export function calcularResultadoExercicio(empresa: Empresa): number {
    const lancamentosValidos = empresa.lancamentos.filter(l => !l.isDeleted && !l.isEncerramento);
    const saldosBrutos = calcularSaldosBrutos(empresa.planoDeContas, lancamentosValidos);
    const dre = getValoresDRE(empresa.planoDeContas, saldosBrutos);
    return dre.lucroLiquido;
}


export function getMovimentacaoContas(
  rootContaId: string,
  planoDeContas: ContaContabil[],
  lancamentos: LancamentoContabil[]
): MovimentacaoConta {
  const accountIds = new Set<string>();
  const accountsToProcess: string[] = [rootContaId];
  
  const processed = new Set<string>();

  while(accountsToProcess.length > 0) {
    const currentId = accountsToProcess.pop();
    if(currentId && !processed.has(currentId)) {
        processed.add(currentId);
        const conta = planoDeContas.find(c => c.id === currentId);
        if(conta && conta.tipo === TipoConta.ANALITICA) {
            accountIds.add(currentId);
        }
        planoDeContas.forEach(c => {
            if (c.paiId === currentId) {
                accountsToProcess.push(c.id);
            }
        });
    }
  }
  
  let totalDebitos = 0;
  let totalCreditos = 0;

  lancamentos.forEach(l => {
    if (l.isDeleted) return;
    l.partidas.forEach(p => {
      if (accountIds.has(p.contaId)) {
        if (p.tipo === 'D') totalDebitos += p.valor;
        if (p.tipo === 'C') totalCreditos += p.valor;
      }
    });
  });

  // Net change should always be D-C for consistency. The interpretation happens later.
  const netChange = totalDebitos - totalCreditos;

  return { totalDebitos, totalCreditos, netChange };
}

export function getVariacoesDFC(planoDeContas: ContaContabil[], lancamentos: LancamentoContabil[]) {
    const variacoes = {
        FCO: { total: 0, detalhe: [] as { nome: string, variacao: number }[] },
        FCI: { total: 0, detalhe: [] as { nome: string, variacao: number }[] },
        FCF: { total: 0, detalhe: [] as { nome: string, variacao: number }[] },
    };

    planoDeContas.forEach(conta => {
        // CRITICAL FIX: Only include BALANCE SHEET accounts in the variation calculation
        const isPatrimonial = [NaturezaConta.ATIVO, NaturezaConta.PASSIVO, NaturezaConta.PL].includes(conta.natureza);

        if (conta.tipo === TipoConta.ANALITICA && conta.tipoDFC !== TipoDFC.NAO_SE_APLICA && isPatrimonial) {
            const movimentacao = getMovimentacaoContas(conta.id, planoDeContas, lancamentos);
            let variacaoEfeitoCaixa = 0;
            
            // FCO: Working capital changes
            if(conta.tipoDFC === TipoDFC.FCO) {
                // An increase in an asset (positive netChange D-C) consumes cash (-).
                // An increase in a liability (negative netChange D-C) provides cash (+).
                variacaoEfeitoCaixa = -movimentacao.netChange;
                
                if (Math.abs(variacaoEfeitoCaixa) > 0.01) {
                     variacoes.FCO.total += variacaoEfeitoCaixa;
                     variacoes.FCO.detalhe.push({ nome: `Variação em ${conta.nome}`, variacao: variacaoEfeitoCaixa });
                }
            }
            // FCI & FCF
            else if(conta.tipoDFC === TipoDFC.FCI || conta.tipoDFC === TipoDFC.FCF) {
                 // Sale/Receipt (Credit) provides cash (+). Purchase/Payment (Debit) consumes cash (-).
                 variacaoEfeitoCaixa = movimentacao.totalCreditos - movimentacao.totalDebitos;
                 if (Math.abs(variacaoEfeitoCaixa) > 0.01) {
                    if (conta.tipoDFC === TipoDFC.FCI) {
                        variacoes.FCI.total += variacaoEfeitoCaixa;
                        variacoes.FCI.detalhe.push({ nome: `Movimentação em ${conta.nome}`, variacao: variacaoEfeitoCaixa });
                    } else {
                        variacoes.FCF.total += variacaoEfeitoCaixa;
                        variacoes.FCF.detalhe.push({ nome: `Movimentação em ${conta.nome}`, variacao: variacaoEfeitoCaixa });
                    }
                 }
            }
        }
    });

    return variacoes;
}

export function getIndicadoresFinanceiros(empresa: Empresa, saldosBalanco: Map<string, number>) {
    // DRE values must be calculated based on period movements (pre-closing).
    const lancamentosPeriodo = empresa.lancamentos.filter(l => !l.isDeleted && !l.isEncerramento);
    const saldosBrutosDRE = calcularSaldosBrutos(empresa.planoDeContas, lancamentosPeriodo);
    const dreValues = getValoresDRE(empresa.planoDeContas, saldosBrutosDRE);

    const { lucroLiquido, custos, receitaLiquida, resultadoOperacional, lucroBruto, despesasOperacionais } = dreValues;

    const { planoDeContas } = empresa;
    const findSaldo = (codigo: string) => {
        const conta = planoDeContas.find(c => c.codigo === codigo);
        return conta ? saldosBalanco.get(conta.id) || 0 : 0;
    };

    // Balance Sheet values are from the final, presentation-ready map.
    const totalAtivo = findSaldo('1');
    const patrimonioLiquido = findSaldo('3');
    const ativoCirculante = findSaldo('1.1');
    const passivoCirculante = findSaldo('2.1');
    const estoques = findSaldo('1.1.3');
    const contasAReceber = findSaldo('1.1.2');
    const fornecedores = findSaldo('2.1.1');
    const caixa = findSaldo('1.1.1');
    
    // Depreciation expense is from the DRE calculation.
    const despesaDepreciacaoConta = empresa.planoDeContas.find(c => c.codigo === '5.2.3.01');
    const despesaDepreciacao = despesaDepreciacaoConta ? (saldosBrutosDRE.get(despesaDepreciacaoConta.id) || 0) : 0;
    
    const ebitda = resultadoOperacional + despesaDepreciacao;

    // Liquidez
    const liquidezCorrente = passivoCirculante > 0 ? ativoCirculante / passivoCirculante : Infinity;
    const liquidezSeca = passivoCirculante > 0 ? (ativoCirculante - estoques) / passivoCirculante : Infinity;

    // Rentabilidade
    const ROA = totalAtivo > 0 ? lucroLiquido / totalAtivo : 0;
    const ROE = patrimonioLiquido > 0 ? lucroLiquido / patrimonioLiquido : 0;
    const margemBruta = receitaLiquida > 0 ? lucroBruto / receitaLiquida : 0;
    const margemLiquida = receitaLiquida > 0 ? lucroLiquido / receitaLiquida : 0;
    const margemEBITDA = receitaLiquida !== 0 ? ebitda / receitaLiquida : 0;

    // Eficiência/Ciclo
    const giroDoAtivo = totalAtivo > 0 ? receitaLiquida / totalAtivo : 0;
    const DSO_PMR = receitaLiquida > 0 ? (contasAReceber / receitaLiquida) * 360 : 0;
    const DPO_PMP = custos > 0 ? (fornecedores / custos) * 360 : 0;
    const DIO_PME = custos > 0 ? (estoques / custos) * 360 : 0;
    const CCC = DIO_PME + DSO_PMR - DPO_PMP;

    // Endividamento
    const passivoNaoCirculante = findSaldo('2.2');
    const dividaBruta = passivoCirculante + passivoNaoCirculante;
    const dividaLiquida = dividaBruta - caixa;
    const dividaLiquidaSobreEBITDA = ebitda !== 0 ? dividaLiquida / ebitda : Infinity;
    const alavancagemFinanceira = patrimonioLiquido > 0 ? totalAtivo / patrimonioLiquido : 0;
    
    // DuPont
    const dupont = {
        margemLiquida,
        giroDoAtivo,
        alavancagemFinanceira,
        roeCalculado: margemLiquida * giroDoAtivo * alavancagemFinanceira,
    };

    return {
        ...dreValues,
        ebitda,
        liquidezCorrente,
        liquidezSeca,
        ROA,
        ROE,
        margemBruta,
        margemLiquida,
        margemEBITDA,
        DSO_PMR,
        DPO_PMP,
        DIO_PME,
        CCC,
        dividaLiquida,
        dividaLiquidaSobreEBITDA,
        dupont,
    };
}