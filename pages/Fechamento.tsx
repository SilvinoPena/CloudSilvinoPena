



import React, { useState, useMemo } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { Card, Button, Input, Alert, AlertDescription, Spinner, Modal } from '../components/ui';
import { CalculatorIcon, CheckCircleIcon, AlertCircleIcon, ArrowUturnLeftIcon, TrashIcon } from '../components/ui/Icons';
import { getValoresDRE, formatCurrency, calcularSaldos } from '../services/contabilidadeService';
import { LancamentoContabil, NaturezaConta, TipoConta } from '../types';

const Fechamento: React.FC = () => {
    const { empresaSelecionada, addLancamentosBatch, addLancamento, desfazerApuracao } = useContabilidade();
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);

    const [depreciacao, setDepreciacao] = useState({
        data: new Date().toISOString().split('T')[0],
        valor: ''
    });

    const [cmv, setCmv] = useState({
        data: new Date().toISOString().split('T')[0],
        valor: ''
    });

    const lancamentosPeriodo = useMemo(() => {
        if (!empresaSelecionada) return [];
        // Considera lançamentos do exercício corrente que não sejam de encerramento
        return empresaSelecionada.lancamentos.filter(l => !l.isDeleted && !l.isEncerramento);
    }, [empresaSelecionada]);

    const saldos = useMemo(() => {
        if (!empresaSelecionada) return new Map<string, number>();
        // Saldos para apuração são calculados apenas com base nos lançamentos do período, antes do fechamento.
        return calcularSaldos(empresaSelecionada.planoDeContas, lancamentosPeriodo);
    }, [empresaSelecionada, lancamentosPeriodo]);

    const dre = useMemo(() => {
        if (!empresaSelecionada) return null;
        return getValoresDRE(empresaSelecionada.planoDeContas, saldos);
    }, [empresaSelecionada, saldos]);

    const apuracaoJaRealizada = useMemo(() => {
        return empresaSelecionada?.lancamentos.some(l => l.isEncerramento && !l.isDeleted);
    }, [empresaSelecionada]);


    if (!empresaSelecionada || !dre) {
        return <p>Selecione uma empresa para acessar as ferramentas de fechamento.</p>;
    }

    const handleIniciarApuracao = () => {
        setFeedback(null);
        if (apuracaoJaRealizada) {
            setFeedback({ type: 'error', message: "Apuração já realizada para este período. Use o botão 'Desfazer Apuração' para reiniciar." });
            return;
        }
        if (Math.abs(dre.lucroLiquido) < 0.01) {
            setFeedback({ type: 'error', message: 'Nenhum resultado a ser apurado. Verifique se existem lançamentos de receita e despesa no período.' });
            return;
        }
        setReviewModalOpen(true);
    };
    
    const handleConfirmarApuracao = () => {
        setIsLoading(true);
        setFeedback(null);

        const areAccount = empresaSelecionada.planoDeContas.find(c => c.codigo === '7.1.1.01');
        const lucrosAccount = empresaSelecionada.planoDeContas.find(c => c.codigo === '3.2.1.01');

        if (!areAccount || !lucrosAccount) {
            setFeedback({ type: 'error', message: "Contas essenciais para apuração (ARE ou Lucros Acumulados) não encontradas no plano de contas." });
            setIsLoading(false);
            return;
        }

        const pnlContas = empresaSelecionada.planoDeContas.filter(c =>
            [NaturezaConta.RECEITA, NaturezaConta.CUSTO, NaturezaConta.DESPESA].includes(c.natureza) &&
            c.tipo === TipoConta.ANALITICA
        );
        
        const dataLancamento = `${new Date(empresaSelecionada.inicioExercicio).getFullYear()}-12-31`;

        const lancamentoZeramento: Omit<LancamentoContabil, 'id'|'isDeleted'> = {
            data: dataLancamento,
            historico: `Zeramento das Contas de Resultado do Exercício de ${new Date(dataLancamento).getFullYear()}`,
            partidas: [],
            isEncerramento: true,
        };

        pnlContas.forEach(conta => {
            const saldoConta = Math.abs(saldos.get(conta.id) || 0);
            if (saldoConta < 0.01) return;

            const isCreditNature = [NaturezaConta.RECEITA].includes(conta.natureza);
            const effectiveIsCreditNature = conta.isRedutora ? !isCreditNature : isCreditNature;

            if (effectiveIsCreditNature) {
                lancamentoZeramento.partidas.push({ contaId: conta.id, tipo: 'D', valor: saldoConta });
            } else {
                lancamentoZeramento.partidas.push({ contaId: conta.id, tipo: 'C', valor: saldoConta });
            }
        });
        
        if (dre.lucroLiquido > 0) {
            lancamentoZeramento.partidas.push({ contaId: areAccount.id, tipo: 'C', valor: dre.lucroLiquido });
        } else {
            lancamentoZeramento.partidas.push({ contaId: areAccount.id, tipo: 'D', valor: Math.abs(dre.lucroLiquido) });
        }
        
        const lancamentoTransferenciaPL: Omit<LancamentoContabil, 'id'|'isDeleted'> = {
            data: dataLancamento,
            historico: 'Transferência do Resultado Apurado para o Patrimônio Líquido',
            partidas: [],
            isEncerramento: true,
        };

        if (dre.lucroLiquido > 0) {
            lancamentoTransferenciaPL.partidas.push({ contaId: areAccount.id, tipo: 'D', valor: dre.lucroLiquido });
            lancamentoTransferenciaPL.partidas.push({ contaId: lucrosAccount.id, tipo: 'C', valor: dre.lucroLiquido });
        } else {
            lancamentoTransferenciaPL.partidas.push({ contaId: lucrosAccount.id, tipo: 'D', valor: Math.abs(dre.lucroLiquido) });
            lancamentoTransferenciaPL.partidas.push({ contaId: areAccount.id, tipo: 'C', valor: Math.abs(dre.lucroLiquido) });
        }

        if (lancamentoZeramento.partidas.length > 1) {
            addLancamentosBatch([lancamentoZeramento, lancamentoTransferenciaPL]);
            setFeedback({ type: 'success', message: 'Lançamentos de apuração do resultado gerados com sucesso!' });
        } else {
             setFeedback({ type: 'error', message: 'Nenhuma conta de resultado com saldo encontrada para apuração.' });
        }

        setIsLoading(false);
        setReviewModalOpen(false);
    };

    const handleLancar = (tipo: 'depreciacao' | 'cmv') => {
        setIsLoading(true);
        setFeedback(null);
        
        const isDep = tipo === 'depreciacao';
        const form = isDep ? depreciacao : cmv;
        const valor = parseFloat(form.valor);

        if (!valor || valor <= 0 || !form.data) {
             setFeedback({ type: 'error', message: 'Por favor, preencha a data e um valor válido.' });
             setIsLoading(false);
             return;
        }

        // Validação de duplicidade
        const competencia = form.data.substring(0, 7); // YYYY-MM
        const historicoPrefix = isDep ? "Depreciação ref." : "Apuração CMV ref.";
        const jaExiste = empresaSelecionada.lancamentos.some(l => 
            l.data.startsWith(competencia) && l.historico.startsWith(historicoPrefix) && !l.isDeleted
        );
        
        if (jaExiste) {
            if (!window.confirm(`Já existe um lançamento de ${tipo} para a competência ${competencia.substring(5,7)}/${competencia.substring(0,4)}. Deseja lançar mesmo assim?`)) {
                setIsLoading(false);
                return;
            }
        }

        const contaDebitoCod = isDep ? '5.2.3.01' : '6.1.1.01';
        const contaCreditoCod = isDep ? '1.2.1.09' : '1.1.3.01';
        const historico = isDep 
            ? `Depreciação ref. ${new Date(form.data).toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC'})}`
            : `Apuração CMV ref. ${new Date(form.data).toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC'})}`;
        
        const contaDebito = empresaSelecionada.planoDeContas.find(c => c.codigo === contaDebitoCod);
        const contaCredito = empresaSelecionada.planoDeContas.find(c => c.codigo === contaCreditoCod);

        if (!contaDebito || !contaCredito) {
            setFeedback({ type: 'error', message: `Conta de débito (${contaDebitoCod}) ou crédito (${contaCreditoCod}) não encontrada.` });
            setIsLoading(false);
            return;
        }
        
        const novoLancamento: Omit<LancamentoContabil, 'id'|'isDeleted'|'isEncerramento'> = {
            data: form.data,
            historico,
            partidas: [
                { contaId: contaDebito.id, tipo: 'D', valor },
                { contaId: contaCredito.id, tipo: 'C', valor }
            ]
        };

        addLancamento(novoLancamento);
        setFeedback({ type: 'success', message: `Lançamento de ${tipo} efetuado com sucesso!` });
        if (isDep) setDepreciacao({ data: new Date().toISOString().split('T')[0], valor: ''});
        else setCmv({ data: new Date().toISOString().split('T')[0], valor: ''});
        setIsLoading(false);
    };

    const handleDesfazerApuracao = () => {
        if (window.confirm("Tem certeza que deseja desfazer a última apuração? Todos os lançamentos de encerramento do exercício serão excluídos permanentemente.")) {
            desfazerApuracao();
            setFeedback({ type: 'success', message: 'Apuração desfeita com sucesso.' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-black">Fechamento e Apuração Automatizada</h2>
                    <p className="text-black">Ferramentas para automatizar os lançamentos de encerramento do exercício.</p>
                </div>
            </div>

            {feedback && (
                <Alert variant={feedback.type === 'success' ? 'default' : 'destructive'} className="my-4">
                    {feedback.type === 'success' ? <CheckCircleIcon className="h-5 w-5 text-black" /> : <AlertCircleIcon className="h-5 w-5 text-black" />}
                    <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-black mb-2">Apuração do Resultado (ARE)</h3>
                    <p className="text-sm text-black mb-4 flex-grow">Zera as contas de resultado e transfere o lucro ou prejuízo para o Patrimônio Líquido.</p>
                    <div className="bg-blue-50 p-4 rounded-lg text-center mb-4">
                        <p className="text-sm text-black">Resultado a Apurar</p>
                        <p className="text-2xl font-bold text-black">
                            {apuracaoJaRealizada ? 'APURADO' : formatCurrency(dre.lucroLiquido)}
                        </p>
                    </div>
                    <Button onClick={handleIniciarApuracao} disabled={isLoading || apuracaoJaRealizada} className="w-full">
                        {isLoading ? <Spinner /> : 'Iniciar Apuração do Exercício'}
                    </Button>
                    {apuracaoJaRealizada && (
                        <Button onClick={handleDesfazerApuracao} disabled={isLoading} variant="danger" className="w-full mt-2 flex items-center justify-center gap-2">
                            <TrashIcon className="h-4 w-4" /> Desfazer Apuração
                        </Button>
                    )}
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-black mb-2">Lançamento de Depreciação</h3>
                    <p className="text-sm text-black mb-4">Efetua o lançamento mensal da despesa de depreciação do imobilizado.</p>
                    <div className="space-y-4 mb-4">
                        <Input 
                            label="Competência do Lançamento" 
                            type="date" 
                            value={depreciacao.data}
                            onChange={(e) => setDepreciacao(p => ({ ...p, data: e.target.value }))}
                        />
                         <Input 
                            label="Valor da Depreciação (R$)" 
                            type="number" 
                            placeholder="Ex: 150.00"
                            value={depreciacao.valor}
                            onChange={(e) => setDepreciacao(p => ({ ...p, valor: e.target.value }))}
                        />
                    </div>
                     <Button onClick={() => handleLancar('depreciacao')} disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : 'Lançar Depreciação'}
                    </Button>
                </Card>

                 <Card className="p-6">
                    <h3 className="text-lg font-semibold text-black mb-2">Apuração do CMV</h3>
                    <p className="text-sm text-black mb-4">Automatiza a baixa de estoque e o reconhecimento do Custo da Mercadoria Vendida.</p>
                     <div className="space-y-4 mb-4">
                        <Input 
                            label="Competência da Apuração" 
                            type="date" 
                            value={cmv.data}
                            onChange={(e) => setCmv(p => ({ ...p, data: e.target.value }))}
                        />
                         <Input 
                            label="Custo Total das Vendas (R$)" 
                            type="number" 
                            placeholder="Ex: 1250.00"
                            value={cmv.valor}
                            onChange={(e) => setCmv(p => ({ ...p, valor: e.target.value }))}
                        />
                    </div>
                     <Button onClick={() => handleLancar('cmv')} disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : 'Lançar CMV'}
                    </Button>
                </Card>
            </div>

            <Modal isOpen={isReviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Revisão do Fechamento do Exercício">
                <div className="space-y-4">
                    <p className="text-black">Você está prestes a realizar os lançamentos de encerramento do exercício. Por favor, revise os valores abaixo.</p>
                    
                    <div className="bg-blue-100 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-black">Resultado Líquido do Exercício a Apurar:</span>
                            <span className="font-bold text-lg text-black">{formatCurrency(dre.lucroLiquido)}</span>
                        </div>
                    </div>

                    <div className="text-sm text-black">
                        <p>Serão gerados <strong>2 lançamentos contábeis</strong>:</p>
                        <ul className="list-disc list-inside ml-2">
                            <li><strong>Zeramento das Contas de Resultado:</strong> Todas as contas de Receita, Despesa e Custo serão zeradas contra a conta "Apuração do Resultado do Exercício".</li>
                            <li><strong>Transferência para PL:</strong> O resultado líquido será transferido da conta "Apuração do Resultado do Exercício" para "Lucros/Prejuízos Acumulados".</li>
                        </ul>
                    </div>
                     
                    <Alert variant="default">
                        <AlertCircleIcon className="h-5 w-5"/>
                        <AlertDescription>Esta ação pode ser desfeita usando o botão "Desfazer Apuração" na tela principal de Fechamento.</AlertDescription>
                    </Alert>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmarApuracao} disabled={isLoading}>
                            {isLoading ? <Spinner/> : "Confirmar e Lançar"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Fechamento;