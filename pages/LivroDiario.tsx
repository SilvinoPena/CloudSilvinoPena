import React, { useState, useMemo, useRef } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { Partida, TipoConta, LancamentoContabil, ContaContabil, NaturezaConta } from '../types';
import { Button, Input, Card, Modal, Select, Textarea, Badge, Alert, AlertDescription, Spinner } from '../components/ui/index';
import { PlusCircleIcon, TrashIcon, CalculatorIcon, CheckCircleIcon, AlertCircleIcon, SparklesIcon, EyeIcon, PencilSquareIcon, ArrowUturnLeftIcon, FunnelIcon, XMarkIcon, DocumentArrowUpIcon, DocumentArrowDownIcon } from '../components/ui/Icons';
import { formatCurrency } from '../services/contabilidadeService';
import { sugerirContasPorHistorico, processarComprovanteComIA } from '../services/geminiService';

const LivroDiario: React.FC = () => {
  const { empresaSelecionada, addLancamento, updateLancamento, deleteLancamento, restoreLancamento, addLancamentosBatch } = useContabilidade();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [lancamentoEmEdicao, setLancamentoEmEdicao] = useState<LancamentoContabil | null>(null);
  const [view, setView] = useState<'ativos' | 'excluidos'>('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [pageFeedback, setPageFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const initialPartida: Partida = { contaId: '', tipo: 'D', valor: 0 };
  const initialFormState: Omit<LancamentoContabil, 'id' | 'isDeleted'> = {
    data: new Date().toISOString().split('T')[0],
    historico: '',
    partidas: [initialPartida, initialPartida],
    comprovantePdf: undefined,
  }
  const [formState, setFormState] = useState(initialFormState);
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [comprovanteFileName, setComprovanteFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importValidation, setImportValidation] = useState<{
      validEntries: Omit<LancamentoContabil, 'id' | 'isDeleted'>[];
      errors: string[];
      fileName: string;
  } | null>(null);
  const [isImportValidating, setIsImportValidating] = useState(false);


  const contasAnaliticas = useMemo(() => 
    empresaSelecionada?.planoDeContas.filter(c => c.tipo === TipoConta.ANALITICA).sort((a,b) => a.codigo.localeCompare(b.codigo)) || [],
    [empresaSelecionada]
  );
  
  const contasLancaveis = useMemo(() => {
    return contasAnaliticas.filter(c => {
        const isResultAccount = [NaturezaConta.RECEITA, NaturezaConta.CUSTO, NaturezaConta.DESPESA].includes(c.natureza);
        if(isResultAccount) {
            return !!c.tipoDRE;
        }
        return !c.tipoDRE;
    });
  }, [contasAnaliticas]);


  const resetForm = () => {
    setFormState(initialFormState);
    setLancamentoEmEdicao(null);
    setValidationError('');
    setSuggestionError('');
    setComprovanteFileName('');
  }

  const handleModalOpen = (lancamento: LancamentoContabil | null = null) => {
    resetForm();
    setPageFeedback(null);
    if (lancamento) {
      setLancamentoEmEdicao(lancamento);
      setFormState({
        data: lancamento.data,
        historico: lancamento.historico,
        partidas: JSON.parse(JSON.stringify(lancamento.partidas)),
        comprovantePdf: lancamento.comprovantePdf,
      });
      if (lancamento.comprovantePdf) {
        setComprovanteFileName(`comprovante_lcto_${lancamento.id.slice(-6)}.pdf`);
      }
    }
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    resetForm();
  }

  const handlePartidaChange = (index: number, field: keyof Partida, value: string | number) => {
    const novasPartidas = [...formState.partidas];
    (novasPartidas[index] as any)[field] = value;
    if (field === 'valor') (novasPartidas[index] as any)[field] = parseFloat(value as string) || 0;
    setFormState(prev => ({ ...prev, partidas: novasPartidas }));
  };
  
  const addNovaPartida = () => setFormState(prev => ({...prev, partidas: [...prev.partidas, initialPartida]}));
  const removePartida = (index: number) => setFormState(prev => ({...prev, partidas: prev.partidas.filter((_, i) => i !== index)}));

  const totalDebito = formState.partidas.reduce((acc, p) => p.tipo === 'D' ? acc + p.valor : acc, 0);
  const totalCredito = formState.partidas.reduce((acc, p) => p.tipo === 'C' ? acc + p.valor : acc, 0);
  const isBalanceado = totalDebito === totalCredito && totalDebito > 0;

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaSelecionada) return;

    const supportedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!supportedTypes.includes(file.type)) {
        setSuggestionError('Formato de arquivo não suportado. Use JPG, PNG ou PDF.');
        e.target.value = ''; 
        return;
    }
    
    setIsImporting(true);
    setSuggestionError('');
    setValidationError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const fileBase64 = event.target?.result as string;
            
            const result = await processarComprovanteComIA(fileBase64, file.type, contasLancaveis);

            if (result.erro) {
                setSuggestionError(result.erro);
            } else if (result.data && result.historico && result.valor && result.contaDebitoId && result.contaCreditoId) {
                if(result.valor <= 0) {
                    setSuggestionError("O valor extraído do comprovante deve ser maior que zero.");
                    setIsImporting(false);
                    e.target.value = '';
                    return;
                }
                setFormState({
                    data: result.data,
                    historico: result.historico,
                    comprovantePdf: file.type === 'application/pdf' ? fileBase64 : undefined,
                    partidas: [
                        { contaId: result.contaDebitoId, tipo: 'D', valor: result.valor },
                        { contaId: result.contaCreditoId, tipo: 'C', valor: result.valor },
                    ]
                });
                setComprovanteFileName(file.name);
            }
        } catch (error) {
            console.error(error);
            setSuggestionError('Ocorreu um erro inesperado ao processar o arquivo.');
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };
    reader.onerror = () => {
        setSuggestionError('Falha ao ler o arquivo.');
        setIsImporting(false);
        e.target.value = '';
    };
    reader.readAsDataURL(file);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (!isBalanceado) {
      setValidationError('O total de débitos deve ser igual ao total de créditos e maior que zero.');
      return;
    }
     if (formState.partidas.some(p => !p.contaId)) {
      setValidationError('Todas as partidas devem ter uma conta selecionada.');
      return;
    }
     if (formState.historico.trim() === '') {
      setValidationError('O campo Histórico é obrigatório.');
      return;
    }
    
    if (lancamentoEmEdicao) {
        updateLancamento({ ...lancamentoEmEdicao, ...formState });
    } else {
        addLancamento(formState);
    }
    handleModalClose();
  };

  const handleSuggest = async () => {
    if (!formState.historico.trim()) {
        setSuggestionError('Por favor, preencha o histórico para obter uma sugestão.');
        return;
    }
    setIsSuggesting(true);
    setSuggestionError('');
    setValidationError('');

    const result = await sugerirContasPorHistorico(formState.historico, contasLancaveis);
    
    if (result.erro) {
        setSuggestionError(result.erro);
    } else if (result.contaDebitoId && result.contaCreditoId) {
        const novasPartidas = [...formState.partidas];
        if(novasPartidas.length < 2) {
          novasPartidas.push(initialPartida);
          novasPartidas.push(initialPartida);
        }
        novasPartidas[0] = { ...novasPartidas[0], contaId: result.contaDebitoId, tipo: 'D' };
        novasPartidas[1] = { ...novasPartidas[1], contaId: result.contaCreditoId, tipo: 'C' };
        setFormState(prev => ({...prev, partidas: novasPartidas}));
    }
    setIsSuggesting(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja mover este lançamento para a lixeira?")) {
      deleteLancamento(id);
      setPageFeedback({ type: 'success', message: 'Lançamento movido para a lixeira.' });
    }
  }

  const handleRestore = (id: string) => {
      restoreLancamento(id);
  }

  const viewPdf = (pdfBase64: string) => {
      const pdfWindow = window.open("");
      if (pdfWindow) {
        pdfWindow.document.write(`<body style="margin: 0;"><iframe width='100%' height='100%' src='${pdfBase64}' style="border: none;"></iframe></body>`);
        pdfWindow.document.title = "Comprovante PDF";
      }
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
  };

  const lancamentosFiltrados = useMemo(() => {
    if (!empresaSelecionada) return [];
    
    return empresaSelecionada.lancamentos
        .filter(l => {
          const viewFilter = view === 'ativos' ? !l.isDeleted : l.isDeleted;
          if (!viewFilter) return false;

          const searchFilter = searchTerm
            ? l.historico.toLowerCase().includes(searchTerm.toLowerCase())
            : true;
          if (!searchFilter) return false;

          if (dateRange.start && l.data < dateRange.start) return false;
          if (dateRange.end && l.data > dateRange.end) return false;
          
          return true;
        })
        .sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime() || b.id.localeCompare(a.id));
  }, [empresaSelecionada, view, searchTerm, dateRange]);
  
  const totalDebitosGeral = empresaSelecionada?.lancamentos.filter(l => !l.isDeleted).reduce((acc, l) => acc + l.partidas.filter(p => p.tipo === 'D').reduce((s, p) => s + p.valor, 0), 0) || 0;
  const totalCreditosGeral = empresaSelecionada?.lancamentos.filter(l => !l.isDeleted).reduce((acc, l) => acc + l.partidas.filter(p => p.tipo === 'C').reduce((s, p) => s + p.valor, 0), 0) || 0;
  const isGeralBalanceado = totalDebitosGeral.toFixed(2) === totalCreditosGeral.toFixed(2);
  
  // --- Import/Export Handlers ---

  const handleExport = () => {
      if (!empresaSelecionada || lancamentosFiltrados.length === 0) {
          alert("Não há lançamentos para exportar com os filtros atuais.");
          return;
      }

      const contaMap = new Map(empresaSelecionada.planoDeContas.map(c => [c.id, c.codigo]));

      const lancamentosParaExportar = lancamentosFiltrados.map(l => ({
          data: l.data,
          historico: l.historico,
          partidas: l.partidas.map(p => ({
              contaCodigo: contaMap.get(p.contaId) || 'CONTA_NAO_ENCONTRADA',
              tipo: p.tipo,
              valor: p.valor
          }))
      }));

      const jsonString = JSON.stringify(lancamentosParaExportar, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dataStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `lancamentos_G-ConFin_${empresaSelecionada.nomeFantasia.replace(/\s+/g, '_')}_${dataStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportValidation(null);
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaSelecionada) return;

    setIsImportValidating(true);
    setImportValidation(null);

    const text = await file.text();
    const errors: string[] = [];
    const validEntries: Omit<LancamentoContabil, 'id' | 'isDeleted'>[] = [];
    const contaCodigoMap = new Map(empresaSelecionada.planoDeContas.map(c => [c.codigo, c]));

    let dataToProcess: any[] = [];

    try {
        const parsedJson = JSON.parse(text);
        if (Array.isArray(parsedJson)) {
            dataToProcess = parsedJson;
        } else if (typeof parsedJson === 'object' && parsedJson !== null) {
            const arrayProp = Object.values(parsedJson).find(v => Array.isArray(v));
            if (arrayProp && Array.isArray(arrayProp)) {
                dataToProcess = arrayProp;
            } else {
                throw new Error("O arquivo JSON é um objeto, mas não contém uma lista (array) de lançamentos.");
            }
        } else {
            throw new Error("O formato do JSON é inválido.");
        }

        dataToProcess.forEach((entry: any, index: number) => {
            const entryNum = index + 1;
            if (!entry.data || !entry.historico || !Array.isArray(entry.partidas)) {
                errors.push(`Lançamento #${entryNum}: Estrutura inválida (faltando data, histórico ou partidas).`);
                return;
            }

            const newPartidas: Partida[] = [];
            let debit = 0;
            let credit = 0;
            let hasError = false;

            entry.partidas.forEach((p: any) => {
                const conta = contaCodigoMap.get(p.contaCodigo);
                if (!conta) {
                    errors.push(`Lançamento #${entryNum}: Código de conta '${p.contaCodigo}' não encontrado no plano de contas.`);
                    hasError = true;
                } else if (conta.tipo === TipoConta.SINTETICA) {
                    errors.push(`Lançamento #${entryNum}: A conta '${p.contaCodigo} - ${conta.nome}' é sintética e não pode receber lançamentos.`);
                    hasError = true;
                } else {
                    newPartidas.push({ contaId: conta.id, tipo: p.tipo, valor: p.valor });
                }
                if (p.tipo === 'D') debit += p.valor;
                if (p.tipo === 'C') credit += p.valor;
            });

            if (hasError) return;

            if (Math.abs(debit - credit) > 0.01) {
                errors.push(`Lançamento #${entryNum}: Desbalanceado (Débito: ${debit.toFixed(2)}, Crédito: ${credit.toFixed(2)}).`);
                return;
            }

            validEntries.push({
                data: entry.data,
                historico: entry.historico,
                partidas: newPartidas,
                isEncerramento: false,
            });
        });
    } catch (e: any) {
        errors.push(`Erro ao processar o arquivo: ${e.message}`);
    }

    setImportValidation({ validEntries, errors, fileName: file.name });
    setIsImportValidating(false);
  };

  const handleConfirmImport = () => {
      if (!importValidation || importValidation.validEntries.length === 0) return;
      addLancamentosBatch(importValidation.validEntries);
      handleCloseImportModal();
      setPageFeedback({ type: 'success', message: `${importValidation.validEntries.length} lançamento(s) importado(s) com sucesso!` });
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Lançamentos Contábeis</h2>
          <p className="text-black">Módulo 2 - Partidas Dobradas (CPC 00 R2)</p>
          {empresaSelecionada && <p className="text-sm text-black">Empresa: {empresaSelecionada.razaoSocial}</p>}
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExport} variant="secondary" className="flex items-center gap-2">
            <DocumentArrowDownIcon className="h-5 w-5" />
            Exportar
          </Button>
          <Button onClick={() => { setPageFeedback(null); setIsImportModalOpen(true); }} variant="secondary" className="flex items-center gap-2">
            <DocumentArrowUpIcon className="h-5 w-5" />
            Importar
          </Button>
          <Button onClick={() => handleModalOpen()} className="flex items-center gap-2">
            <PlusCircleIcon className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>
      
      {pageFeedback && (
          <Alert variant={pageFeedback.type === 'success' ? 'default' : 'destructive'} className="my-4">
              {pageFeedback.type === 'success' ? <CheckCircleIcon className="h-5 w-5" /> : <AlertCircleIcon className="h-5 w-5" />}
              <AlertDescription>{pageFeedback.message}</AlertDescription>
          </Alert>
      )}

      <Card className="mb-6">
        <div className="p-6">
             <div className="flex items-center space-x-2">
                <CalculatorIcon className="h-5 w-5 text-black" />
                <h3 className="text-lg font-semibold text-black">Validação de Partidas Dobradas</h3>
                {isGeralBalanceado ? (
                  <CheckCircleIcon className="h-5 w-5 text-black" />
                ) : (
                  <AlertCircleIcon className="h-5 w-5 text-black" />
                )}
              </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-b-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
                 <div>
                    <p className="text-sm text-black">Total Débitos (Ativos)</p>
                    <p className="text-2xl font-bold text-black">{formatCurrency(totalDebitosGeral)}</p>
                </div>
                 <div>
                    <p className="text-sm text-black">Total Créditos (Ativos)</p>
                    <p className="text-2xl font-bold text-black">{formatCurrency(totalCreditosGeral)}</p>
                </div>
                <div>
                     <p className="text-sm text-black">Status</p>
                     <Badge variant={isGeralBalanceado ? 'success' : 'destructive'} className="text-sm mt-2">
                        {isGeralBalanceado ? '✓ Balanceado' : '✗ Desbalanceado'}
                    </Badge>
                </div>
            </div>
        </div>
    </Card>

    <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
                <Input
                    label="Pesquisar no Histórico"
                    id="search-term"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ex: pagamento de salários..."
                />
            </div>
            <div className="md:col-span-3">
                 <Input
                    label="Data de Início"
                    id="start-date"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                />
            </div>
            <div className="md:col-span-3">
                 <Input
                    label="Data de Fim"
                    id="end-date"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                />
            </div>
            <div className="md:col-span-1">
                <Button variant="secondary" onClick={handleClearFilters} className="w-full h-10">
                    <XMarkIcon className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </Card>


      <Card>
         <div className="p-4 sm:p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-black">Livro Diário</h3>
              <p className="text-sm text-black">{view === 'ativos' ? 'Registro cronológico dos lançamentos contábeis' : 'Lançamentos excluídos para fins de auditoria'}</p>
            </div>
             <div className="flex space-x-1 bg-blue-200 p-1 rounded-lg">
                <button onClick={() => setView('ativos')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'ativos' ? 'bg-white shadow text-black' : 'text-black hover:bg-blue-100/50'}`}>Ativos</button>
                <button onClick={() => setView('excluidos')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'excluidos' ? 'bg-white shadow text-black' : 'text-black hover:bg-blue-100/50'}`}>Lixeira</button>
             </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider w-1/6">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider w-3/6">Descrição / Conta</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider w-1/6">Débito</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider w-1/6">Crédito</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {lancamentosFiltrados.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-black">Nenhum lançamento encontrado para os filtros aplicados.</td></tr>}
              {lancamentosFiltrados.map((lancamento) => (
                <React.Fragment key={lancamento.id}>
                    <tr className="border-t-2 border-b border-blue-200 bg-blue-50/70">
                         <td className="px-6 py-3 text-sm font-semibold text-black">{new Date(lancamento.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                         <td className="px-6 py-3 text-sm font-semibold text-black" colSpan={3}>{lancamento.historico}</td>
                         <td className="px-6 py-3 text-right text-sm font-medium space-x-1">
                            {view === 'ativos' ? (
                                <>
                                {lancamento.comprovantePdf && <Button variant="secondary" size="sm" onClick={() => viewPdf(lancamento.comprovantePdf!)} aria-label="Visualizar Comprovante"><EyeIcon className="h-4 w-4"/></Button>}
                                <Button variant="secondary" size="sm" onClick={() => handleModalOpen(lancamento)} aria-label="Editar Lançamento"><PencilSquareIcon className="h-4 w-4"/></Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(lancamento.id)} aria-label="Excluir Lançamento"><TrashIcon className="h-4 w-4"/></Button>
                                </>
                            ) : (
                                <Button variant="secondary" size="sm" onClick={() => handleRestore(lancamento.id)} aria-label="Restaurar Lançamento"><ArrowUturnLeftIcon className="h-4 w-4"/></Button>
                            )}
                         </td>
                    </tr>
                     {lancamento.partidas.map((partida, pIndex) => {
                        const conta = contasAnaliticas.find(c => c.id === partida.contaId);
                        return (
                            <tr key={`${lancamento.id}-${pIndex}`} className="border-b border-blue-100">
                                <td></td>
                                <td className="px-6 py-2 text-sm text-black">{conta ? `${conta.codigo} - ${conta.nome}` : 'Conta inválida'}</td>
                                <td className="px-6 py-2 text-sm text-right font-mono text-black">{partida.tipo === 'D' ? formatCurrency(partida.valor) : null}</td>
                                <td className="px-6 py-2 text-sm text-right font-mono text-black">{partida.tipo === 'C' ? formatCurrency(partida.valor) : null}</td>
                                <td></td>
                            </tr>
                        )
                    })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={lancamentoEmEdicao ? "Editar Lançamento Contábil" : "Novo Lançamento Contábil"}>
        <form onSubmit={handleSubmit} className="space-y-4">
            {isImporting && (
                <div className="absolute inset-0 bg-white/80 flex flex-col justify-center items-center z-10 rounded-lg">
                    <Spinner />
                    <p className="mt-4 font-semibold text-black">Analisando documento com IA...</p>
                </div>
            )}
            {validationError && (
                <Alert variant="destructive">
                    <AlertCircleIcon className="h-5 w-5" />
                    <AlertDescription>{validationError}</AlertDescription>
                </Alert>
            )}
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <h4 className="font-semibold text-black">Automatize com IA</h4>
                <p className="text-sm text-black mb-3">Importe um comprovante (PDF, JPG, PNG) e deixe a IA preencher o lançamento.</p>
                <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting || isSuggesting} className="flex items-center gap-2 mx-auto" variant="secondary">
                    <DocumentArrowUpIcon className="h-5 w-5" />
                    {isImporting ? 'Processando...' : 'Selecionar Comprovante'}
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept="image/png, image/jpeg, application/pdf" />
                {comprovanteFileName && <p className="text-xs text-black mt-2">Arquivo: {comprovanteFileName}</p>}
            </div>

          <div className="grid grid-cols-2 gap-4">
             <Input label="Data *" id="data" type="date" value={formState.data} onChange={e => setFormState(p => ({...p, data: e.target.value}))} required />
          </div>
          
          <Textarea label="Histórico *" id="historico" value={formState.historico} onChange={e => setFormState(p => ({...p, historico: e.target.value}))} required placeholder="Descreva o fato contábil..."/>
          <Button type="button" variant="secondary" onClick={handleSuggest} disabled={isSuggesting || isImporting || !formState.historico.trim()} className="mt-2 flex items-center gap-2">
            <SparklesIcon className={`h-5 w-5 ${isSuggesting ? 'animate-pulse' : ''}`}/>
            {isSuggesting ? 'Sugerindo...' : 'Sugerir Contas (pelo histórico)'}
          </Button>
          {suggestionError && <p className="text-rose-600 text-sm mt-1">{suggestionError}</p>}
          
          <div className="space-y-2 pt-2">
             <h4 className="font-semibold text-black">Partidas</h4>
             {formState.partidas.map((partida, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                   <div className="col-span-6">
                       <Select aria-label={`Conta partida ${index+1}`} id={`conta-${index}`} value={partida.contaId} onChange={e => handlePartidaChange(index, 'contaId', e.target.value)} required>
                           <option value="" disabled>Selecione a conta</option>
                           {contasLancaveis.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
                       </Select>
                   </div>
                   <div className="col-span-2">
                       <Select aria-label={`Tipo partida ${index+1}`} id={`tipo-${index}`} value={partida.tipo} onChange={e => handlePartidaChange(index, 'tipo', e.target.value)}>
                           <option value="D">D</option>
                           <option value="C">C</option>
                       </Select>
                   </div>
                    <div className="col-span-3">
                       <Input aria-label={`Valor partida ${index+1}`} id={`valor-${index}`} type="number" step="0.01" min="0" value={partida.valor} onChange={e => handlePartidaChange(index, 'valor', e.target.value)} required />
                   </div>
                   <div className="col-span-1 flex items-end h-full">
                       <Button type="button" variant="danger" onClick={() => removePartida(index)} className="p-2 h-10 w-10" aria-label="Remover partida"><TrashIcon className="h-5 w-5"/></Button>
                   </div>
                </div>
             ))}
             <Button type="button" variant="secondary" onClick={addNovaPartida} className="mt-2 flex items-center gap-2"><PlusCircleIcon className="h-5 w-5"/> Adicionar Partida</Button>
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-4 border-blue-200">
              <div className="space-y-1 text-sm">
                  <p>Total Débito: <span className="font-semibold text-black">{formatCurrency(totalDebito)}</span></p>
                  <p>Total Crédito: <span className="font-semibold text-black">{formatCurrency(totalCredito)}</span></p>
              </div>
              <div className="font-bold text-lg text-black">
                  {isBalanceado ? '✓ Balanceado' : '✗ Desbalanceado'}
              </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="secondary" onClick={handleModalClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={!isBalanceado || isImporting}>Salvar Lançamento</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={handleCloseImportModal} title="Importar Lançamentos Contábeis">
        <div className="space-y-4">
            <p className="text-sm text-black">Selecione um arquivo JSON exportado do G-ConFin para importar os lançamentos. O sistema validará a compatibilidade com o plano de contas da empresa atual.</p>
            
            <Input type="file" id="import-file-input" accept=".json" onChange={handleImportFileSelect} />

            {isImportValidating && <div className="flex justify-center p-4"><Spinner /></div>}

            {importValidation && (
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold text-black">Resultado da Validação: {importValidation.fileName}</h4>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                            <p className="text-sm text-black">Lançamentos Válidos</p>
                            <p className="text-2xl font-bold text-black">{importValidation.validEntries.length}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
                            <p className="text-sm text-black">Erros Encontrados</p>
                            <p className="text-2xl font-bold text-black">{importValidation.errors.length}</p>
                        </div>
                    </div>

                    {importValidation.errors.length > 0 && (
                        <div>
                            <h5 className="font-semibold text-black mb-2">Detalhes dos Erros:</h5>
                            <div className="max-h-40 overflow-y-auto bg-blue-50 p-3 rounded-md text-sm text-black space-y-1">
                                {importValidation.errors.map((err, i) => <p key={i}>- {err}</p>)}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-blue-200">
                        <Button variant="secondary" onClick={handleCloseImportModal}>Cancelar</Button>
                        <Button 
                            onClick={handleConfirmImport} 
                            disabled={importValidation.validEntries.length === 0}
                        >
                            Importar {importValidation.validEntries.length} Lançamento(s)
                        </Button>
                    </div>
                </div>
            )}
        </div>
      </Modal>

    </div>
  );
};

export default LivroDiario;