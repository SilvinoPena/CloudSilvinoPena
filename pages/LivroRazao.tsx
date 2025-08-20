import React, { useState, useMemo } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { TipoConta, NaturezaConta } from '../types';
import { Select, Card } from '../components/ui/index';
import { getSaldoConta, formatCurrency } from '../services/contabilidadeService';

const LivroRazao: React.FC = () => {
  const { empresaSelecionada } = useContabilidade();
  const [contaSelecionadaId, setContaSelecionadaId] = useState<string>('');

  const contasAnaliticas = useMemo(() => 
    empresaSelecionada?.planoDeContas.filter(c => c.tipo === TipoConta.ANALITICA).sort((a,b) => a.codigo.localeCompare(b.codigo)) || [],
    [empresaSelecionada]
  );
  
  const contaSelecionada = useMemo(() => {
    if (!contaSelecionadaId || !empresaSelecionada) return null;
    return empresaSelecionada.planoDeContas.find(c => c.id === contaSelecionadaId);
  }, [contaSelecionadaId, empresaSelecionada?.planoDeContas]);
  
  const lancamentosComSaldo = useMemo(() => {
    if (!contaSelecionada || !empresaSelecionada) return [];

    const { natureza, isRedutora } = contaSelecionada;

    const lancamentosFiltrados = empresaSelecionada.lancamentos
        .filter(l => !l.isDeleted && l.partidas.some(p => p.contaId === contaSelecionadaId))
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime() || a.id.localeCompare(b.id));

    let saldoCorrente = 0;
    
    const multiplicadorNatureza = (natureza === NaturezaConta.ATIVO || natureza === NaturezaConta.DESPESA || natureza === NaturezaConta.CUSTO) ? 1 : -1;
    const multiplicadorFinal = isRedutora ? multiplicadorNatureza * -1 : multiplicadorNatureza;

    return lancamentosFiltrados.map(lancamento => {
      const partida = lancamento.partidas.find(p => p.contaId === contaSelecionadaId)!;
      const valorDebito = partida.tipo === 'D' ? partida.valor : 0;
      const valorCredito = partida.tipo === 'C' ? partida.valor : 0;

      saldoCorrente += (valorDebito * multiplicadorFinal) + (valorCredito * -multiplicadorFinal);

      return {
        id: lancamento.id,
        data: lancamento.data,
        historico: lancamento.historico,
        valorDebito,
        valorCredito,
        saldoCorrente,
      };
    });
  }, [contaSelecionada, empresaSelecionada]);


  const saldos = useMemo(() => {
      if (!contaSelecionadaId || !empresaSelecionada) return null;
      return getSaldoConta(contaSelecionadaId, empresaSelecionada.lancamentos.filter(l => !l.isDeleted), empresaSelecionada.planoDeContas);
  }, [contaSelecionadaId, empresaSelecionada]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-black mb-6">Livro Razão</h2>
      
      <Card className="mb-6 p-4">
        <Select
          label="Selecione uma conta para exibir o razão"
          value={contaSelecionadaId}
          onChange={(e) => setContaSelecionadaId(e.target.value)}
        >
          <option value="" disabled>Escolha uma conta...</option>
          {contasAnaliticas.map(c => (
            <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>
          ))}
        </Select>
      </Card>
      
      {contaSelecionadaId && saldos && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-black">
                Razão da Conta: {contaSelecionada?.nome}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Histórico</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Débito</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Crédito</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Saldo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-200">
                {lancamentosComSaldo.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4 text-black">Nenhum movimento para esta conta.</td></tr>
                )}
                {lancamentosComSaldo.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{new Date(item.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{item.historico}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-black">{item.valorDebito > 0 ? formatCurrency(item.valorDebito) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-black">{item.valorCredito > 0 ? formatCurrency(item.valorCredito) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-black">{formatCurrency(item.saldoCorrente)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-blue-100 font-bold">
                  <tr>
                      <td colSpan={2} className="px-6 py-3 text-right text-sm text-black uppercase">Totais e Saldo Final</td>
                      <td className="px-6 py-3 text-right text-sm font-mono text-black">{formatCurrency(saldos.totalDebitos)}</td>
                      <td className="px-6 py-3 text-right text-sm font-mono text-black">{formatCurrency(saldos.totalCreditos)}</td>
                      <td className="px-6 py-3 text-right text-sm font-mono text-black">{formatCurrency(saldos.saldoFinal)}</td>
                  </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LivroRazao;