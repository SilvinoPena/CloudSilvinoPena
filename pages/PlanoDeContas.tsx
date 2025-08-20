
import React, { useState, useMemo, useEffect } from 'react';
import { useContabilidade } from '../hooks/useContabilidade';
import { ContaContabil, TipoConta, NaturezaConta, TipoDRE, TipoDFC } from '../types';
import { Card, Button, Modal, Input, Select, Alert, AlertDescription, Badge, BadgeProps, Textarea, Spinner } from '../components/ui/index';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon, ArrowPathIcon, AlertCircleIcon, PlusIcon, DocumentArrowDownIcon, DocumentArrowUpIcon, CheckCircleIcon } from '../components/ui/Icons';


const getBadgeVariant = (natureza: NaturezaConta): BadgeProps['variant'] => {
    switch(natureza) {
        case NaturezaConta.ATIVO: return 'ativo';
        case NaturezaConta.PASSIVO: return 'passivo';
        case NaturezaConta.PL: return 'pl';
        case NaturezaConta.RECEITA: return 'receita';
        case NaturezaConta.DESPESA: return 'despesa';
        case NaturezaConta.CUSTO: return 'custo';
        default: return 'default';
    }
};

interface ContaTreeItemProps {
  conta: ContaContabil;
  contas: ContaContabil[];
  level: number;
  onOpenModal: (options: { edit?: ContaContabil; parentId?: string }) => void;
  onDelete: (contaId: string) => void;
}

const ContaTreeItem: React.FC<ContaTreeItemProps> = ({ conta, contas, level, onOpenModal, onDelete }) => {
  const children = contas.filter(c => c.paiId === conta.id).sort((a,b) => a.codigo.localeCompare(b.codigo));
  const isSintetica = conta.tipo === TipoConta.SINTETICA;

  const childrenNodes = children.length > 0 && (
    <div>
      {children.map(child => (
        <ContaTreeItem key={child.id} conta={child} contas={contas} level={level + 1} onOpenModal={onOpenModal} onDelete={onDelete} />
      ))}
    </div>
  );

  if (isSintetica) {
    return (
      <div style={{ paddingLeft: `${level * 24}px` }} className="group">
        <div className="my-1.5 flex justify-between items-center bg-blue-200 text-black font-semibold rounded p-2 shadow">
          <span>{conta.codigo} - {conta.nome}</span>
          <div className="space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" onClick={() => onOpenModal({ parentId: conta.id })} className="bg-emerald-500 hover:bg-emerald-600 border-none text-black"><PlusIcon className="h-4 w-4"/></Button>
            <Button size="sm" onClick={() => onOpenModal({ edit: conta })} className="bg-black/20 hover:bg-black/30 border-none text-black"><PencilSquareIcon className="h-4 w-4"/></Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(conta.id)}><TrashIcon className="h-4 w-4"/></Button>
          </div>
        </div>
        {childrenNodes}
      </div>
    );
  }
  
  // Analitica
  return (
    <div className="group">
      <div className="py-2 flex justify-between items-center hover:bg-blue-100/50 rounded" style={{ paddingLeft: `${level * 24}px` }}>
        <div className="flex-1 flex items-center gap-3 text-black">
          <span>{conta.codigo} - {conta.nome}</span>
          <Badge variant={getBadgeVariant(conta.natureza)}>{conta.natureza}</Badge>
        </div>
        <div className="pr-4 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="secondary" size="sm" onClick={() => onOpenModal({ edit: conta })} aria-label="Editar conta"><PencilSquareIcon className="h-4 w-4"/></Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(conta.id)} aria-label="Excluir conta"><TrashIcon className="h-4 w-4"/></Button>
        </div>
      </div>
      {childrenNodes}
    </div>
  );
};

const PlanoDeContas: React.FC = () => {
  const { empresaSelecionada, addConta, updateConta, deleteConta, resetPlanoDeContas, replacePlanoDeContas } = useContabilidade();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contaEmEdicao, setContaEmEdicao] = useState<ContaContabil | null>(null);
  const [error, setError] = useState('');
  const [isParentFixed, setIsParentFixed] = useState(false);
  const [pageFeedback, setPageFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // State for import functionality
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportValidating, setIsImportValidating] = useState(false);
  const [importValidation, setImportValidation] = useState<{
      novoPlano: ContaContabil[];
      errors: string[];
      warnings: string[];
      fileName: string;
  } | null>(null);

  const getInitialFormState = (): Omit<ContaContabil, 'id'> => ({
    codigo: '',
    nome: '',
    descricao: '',
    natureza: NaturezaConta.ATIVO,
    tipo: TipoConta.ANALITICA,
    paiId: null,
    isRedutora: false,
    tipoDRE: null,
    tipoDFC: TipoDFC.NAO_SE_APLICA,
  });

  const [formState, setFormState] = useState<Omit<ContaContabil, 'id'>>(getInitialFormState());
  
  const contasSinteticas = useMemo(() => 
    empresaSelecionada?.planoDeContas.filter(c => c.tipo === TipoConta.SINTETICA).sort((a,b) => a.codigo.localeCompare(b.codigo)) || [],
  [empresaSelecionada?.planoDeContas]);

  useEffect(() => {
    // Only generate a new code when creating a new account (not editing)
    if (contaEmEdicao || !empresaSelecionada) return;

    const { planoDeContas } = empresaSelecionada;
    const { paiId, tipo } = formState;

    let newCode = '';

    if (paiId) {
        const parent = planoDeContas.find(c => c.id === paiId);
        // Do not generate if parent does not exist.
        if (!parent) {
            setFormState(prev => ({ ...prev, codigo: '' }));
            return;
        }

        let segment = 1;
        // Loop indefinitely until a unique code is found
        while (true) {
            const formattedSegment = tipo === TipoConta.ANALITICA
                ? String(segment).padStart(2, '0')
                : String(segment);
            const proposedCode = `${parent.codigo}.${formattedSegment}`;

            // Check if the proposed code already exists in the chart of accounts
            const codeExists = planoDeContas.some(c => c.codigo === proposedCode);
            if (!codeExists) {
                newCode = proposedCode;
                break; // Exit loop once a unique code is found
            }
            segment++; // Increment and try the next number
        }
    } else { // Logic for root accounts (no parent)
        let segment = 1;
        while (true) {
            const proposedCode = String(segment);
            const codeExists = planoDeContas.some(c => c.codigo === proposedCode);
            if (!codeExists) {
                newCode = proposedCode;
                break;
            }
            segment++;
        }
    }

    setFormState(prev => ({ ...prev, codigo: newCode }));

  // This effect re-runs whenever the parent, type, or the entire chart of accounts changes, ensuring the code is always fresh.
  }, [formState.paiId, formState.tipo, contaEmEdicao, empresaSelecionada?.planoDeContas]);


  if (!empresaSelecionada) {
    return <p>Selecione uma empresa para ver o plano de contas.</p>;
  }
  
  const handleOpenModal = (options: { edit?: ContaContabil; parentId?: string } = {}) => {
    setError('');
    setPageFeedback(null);
    const { edit, parentId } = options;

    if (edit) {
      setContaEmEdicao(edit);
      setFormState(edit);
      setIsParentFixed(true);
    } else {
      setContaEmEdicao(null);
      const initialState = getInitialFormState();
      if (parentId) {
        initialState.paiId = parentId;
        const parent = empresaSelecionada.planoDeContas.find(c => c.id === parentId);
        if (parent) {
            initialState.natureza = parent.natureza;
        }
        setIsParentFixed(true);
      } else {
        setIsParentFixed(false);
      }
      setFormState(initialState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setContaEmEdicao(null);
    setIsParentFixed(false);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        setFormState(prev => ({ ...prev, [name]: target.checked }));
    } else {
        const value = (target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
        const finalValue = value === 'null' ? null : value;
        setFormState(prev => ({ ...prev, [name]: finalValue as any }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    let result;
    if(contaEmEdicao){
        result = updateConta({...formState, id: contaEmEdicao.id });
    } else {
        result = addConta(formState);
    }

    if(result.success){
        handleCloseModal();
    } else {
        setError(result.message);
    }
  };

  const handleDelete = (contaId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta conta? A ação não poderá ser desfeita.")) {
        const result = deleteConta(contaId);
        if (!result.success) {
            setPageFeedback({ type: 'error', message: result.message });
        } else {
            setPageFeedback({ type: 'success', message: result.message });
        }
    }
  };
  
  const handleReset = () => {
      if (!empresaSelecionada) return;
      const lancamentosExistem = empresaSelecionada.lancamentos.length > 0;
      const message = lancamentosExistem
          ? "Atenção! Existem lançamentos contábeis. Restaurar o plano de contas padrão irá apagar todos os lançamentos para manter a consistência. Deseja continuar?"
          : "Tem certeza que deseja substituir o plano de contas atual pelo padrão?";
      
      if (window.confirm(message)) {
          resetPlanoDeContas();
          setPageFeedback({ type: 'success', message: 'Plano de contas restaurado para o padrão com sucesso.' });
      }
  };
  
  const handleExportPlano = () => {
    if (!empresaSelecionada) return;

    const idToCodigoMap = new Map(empresaSelecionada.planoDeContas.map(c => [c.id, c.codigo]));

    const planoParaExportar = empresaSelecionada.planoDeContas.map(({ id, paiId, ...rest }) => ({
        ...rest,
        paiCodigo: paiId ? idToCodigoMap.get(paiId) || null : null,
    }));

    const jsonString = JSON.stringify(planoParaExportar, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dataStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `plano_de_contas_${empresaSelecionada.nomeFantasia.replace(/\s+/g, '_')}_${dataStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openImportModal = () => {
    setPageFeedback(null);
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportValidation(null);
    const fileInput = document.getElementById('import-plano-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleImportFileSelectPlano = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImportValidating(true);
      setImportValidation(null);
      const text = await file.text();
      
      const { finalPlan, errors, warnings } = processAndValidateChartOfAccounts(text);

      setImportValidation({ novoPlano: finalPlan, errors, warnings, fileName: file.name });
      setIsImportValidating(false);
  };

  const processAndValidateChartOfAccounts = (fileContent: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let accountsData: any[] = [];
  
    // 1. Parse file
    try {
      const parsedJson = JSON.parse(fileContent);
      if (Array.isArray(parsedJson)) {
        accountsData = parsedJson;
      } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        const arrayProp = Object.values(parsedJson).find(v => Array.isArray(v));
        if (arrayProp && Array.isArray(arrayProp)) accountsData = arrayProp;
        else throw new Error("O objeto JSON não contém um array de contas.");
      } else {
        throw new Error("O formato do JSON é inválido.");
      }
    } catch (e: any) {
      errors.push(`Erro de parsing do JSON: ${e.message}`);
      return { finalPlan: [], errors, warnings };
    }
  
    // 2. Normalize and perform initial validation
    const findProp = (obj: any, keys: string[]) => keys.map(k => obj[k]).find(v => v !== undefined && v !== null);
    const codigosPresentes = new Set<string>();
    const tempPlano: (Omit<ContaContabil, 'id' | 'paiId' | 'tipo' | 'natureza'> & { tipo?: TipoConta, natureza?: NaturezaConta })[] = [];
  
    accountsData.forEach((conta: any, index: number) => {
      const codigo = findProp(conta, ['codigo', 'code', 'código']);
      const nome = findProp(conta, ['nome', 'name', 'descricao']);
  
      if (!codigo || !nome) {
        errors.push(`Conta #${index + 1}: Faltam campos essenciais (código, nome).`);
        return;
      }
      if (codigosPresentes.has(codigo)) {
        errors.push(`Conta #${index + 1}: Código '${codigo}' está duplicado no arquivo.`);
        return;
      }
      codigosPresentes.add(codigo);
  
      tempPlano.push({
        codigo,
        nome,
        descricao: findProp(conta, ['descricao_completa', 'full_description']) || nome,
        isRedutora: findProp(conta, ['isRedutora', 'redutora']) || false,
        tipoDRE: findProp(conta, ['tipoDRE']) || null,
        tipoDFC: findProp(conta, ['tipoDFC']) || TipoDFC.NAO_SE_APLICA,
      });
    });
  
    if (errors.length > 0) return { finalPlan: [], errors, warnings };
  
    // 3. Build hierarchy and infer structure
    tempPlano.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
    const codigoToIdMap = new Map<string, string>();
  
    // First pass: create all accounts with IDs
    const planoComIds = tempPlano.map(conta => {
        const newId = crypto.randomUUID();
        const fullConta: any = { ...conta, id: newId, paiId: null, tipo: TipoConta.ANALITICA, natureza: NaturezaConta.ATIVO }; // Default values
        codigoToIdMap.set(conta.codigo, newId);
        return fullConta;
    });

    // Second pass: link parents and determine types
    planoComIds.forEach(conta => {
        const codigoParts = conta.codigo.split(/[.-]/);
        if (codigoParts.length > 1) {
            const paiCodigo = codigoParts.slice(0, -1).join('.');
            if (codigoToIdMap.has(paiCodigo)) {
                conta.paiId = codigoToIdMap.get(paiCodigo) || null;
                const parent = planoComIds.find(p => p.id === conta.paiId);
                if(parent) parent.tipo = TipoConta.SINTETICA; // If it's a parent, it must be synthetic
            } else {
                warnings.push(`Conta '${conta.codigo}': Conta pai com código '${paiCodigo}' não encontrada. Será tratada como conta raiz.`);
            }
        }
    });

    // Third pass: infer nature and finalize
    planoComIds.forEach(conta => {
        let naturezaFinal: NaturezaConta | null = null;
        if(conta.paiId) {
            const parent = planoComIds.find(p => p.id === conta.paiId);
            if(parent) {
                // Herda a natureza do pai para manter a consistência
                naturezaFinal = parent.natureza;
            }
        }
        if(!naturezaFinal) {
            const firstDigit = conta.codigo.charAt(0);
            const mapping: { [key: string]: NaturezaConta } = {
                '1': NaturezaConta.ATIVO, '2': NaturezaConta.PASSIVO, '3': NaturezaConta.PL,
                '4': NaturezaConta.RECEITA, '5': NaturezaConta.DESPESA, '6': NaturezaConta.CUSTO,
            };
            naturezaFinal = mapping[firstDigit] || NaturezaConta.DESPESA; // Default if not standard
            if(!mapping[firstDigit]) warnings.push(`Conta '${conta.codigo}': Não foi possível inferir a natureza pelo código. Assumindo 'Despesa'.`);
        }
        conta.natureza = naturezaFinal;

        // Final validation checks
        if(conta.paiId) {
            const parent = planoComIds.find(p => p.id === conta.paiId);
            if(parent && parent.tipo !== TipoConta.SINTETICA){
                errors.push(`Conta '${conta.codigo}': A conta pai '${parent.codigo}' é analítica, o que é inválido. Corrija o arquivo de origem.`);
            }
        }
        const isResultAccount = [NaturezaConta.RECEITA, NaturezaConta.CUSTO, NaturezaConta.DESPESA].includes(conta.natureza);
        if (isResultAccount && !conta.tipoDRE && conta.tipo === TipoConta.ANALITICA) {
            warnings.push(`Conta de resultado '${conta.codigo}' não possui classificação de DRE.`);
        }
    });

    if (errors.length > 0) return { finalPlan: [], errors, warnings };
    
    return { finalPlan: planoComIds, errors, warnings };
  };

  const handleConfirmImportPlano = () => {
    if (!importValidation || importValidation.novoPlano.length === 0 || importValidation.errors.length > 0) return;
    replacePlanoDeContas(importValidation.novoPlano);
    handleCloseImportModal();
    setPageFeedback({ type: 'success', message: `${importValidation.novoPlano.length} contas importadas com sucesso! Todos os lançamentos anteriores foram excluídos.` });
  };

  const rootContas = empresaSelecionada.planoDeContas.filter(c => !c.paiId).sort((a,b) => a.codigo.localeCompare(b.codigo));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-black">Plano de Contas</h2>
        <div className="space-x-2 flex items-center">
            <Button variant="secondary" onClick={handleExportPlano} className="flex items-center gap-2">
                <DocumentArrowDownIcon className="h-4 w-4"/> Exportar
            </Button>
            <Button variant="secondary" onClick={openImportModal} className="flex items-center gap-2">
                <DocumentArrowUpIcon className="h-4 w-4"/> Importar
            </Button>
            <Button variant="secondary" onClick={handleReset} className="flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4"/> Restaurar Padrão
            </Button>
            <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                <PlusCircleIcon className="h-5 w-5"/> Adicionar Conta
            </Button>
        </div>
      </div>
      
      {pageFeedback && (
          <Alert variant={pageFeedback.type === 'success' ? 'default' : 'destructive'} className="mb-4">
              {pageFeedback.type === 'success' ? <CheckCircleIcon className="h-5 w-5" /> : <AlertCircleIcon className="h-5 w-5" />}
              <AlertDescription>{pageFeedback.message}</AlertDescription>
          </Alert>
      )}

      <Card>
        <div className="divide-y divide-blue-200 p-2">
           {rootContas.map(conta => (
            <ContaTreeItem key={conta.id} conta={conta} contas={empresaSelecionada.planoDeContas} level={0} onOpenModal={handleOpenModal} onDelete={handleDelete}/>
          ))}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={contaEmEdicao ? "Editar Conta Contábil" : "Nova Conta Contábil"}>
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive"><AlertCircleIcon className="h-5 w-5" /><AlertDescription>{error}</AlertDescription></Alert>}
            
            <Input 
              label="Código (Editável)"
              name="codigo"
              value={formState.codigo}
              onChange={handleInputChange}
              required
              className="bg-blue-200 text-black"
            />

            <Input label="Nome da Conta" name="nome" value={formState.nome} onChange={handleInputChange} required/>
            <Textarea label="Descrição" name="descricao" value={formState.descricao} onChange={handleInputChange} />
            <div className="grid grid-cols-2 gap-4">
                <Select label="Natureza" name="natureza" value={formState.natureza} onChange={handleInputChange}>
                    {Object.values(NaturezaConta).map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
                 <Select label="Tipo" name="tipo" value={formState.tipo} onChange={handleInputChange} disabled={!!contaEmEdicao}>
                    <option value={TipoConta.SINTETICA}>Sintética</option>
                    <option value={TipoConta.ANALITICA}>Analítica</option>
                </Select>
            </div>
            <Select label="Conta Pai (Sintética)" name="paiId" value={formState.paiId || ''} onChange={handleInputChange} disabled={isParentFixed || !!contaEmEdicao}>
                 <option value="">Nenhuma (Conta Raiz)</option>
                 {contasSinteticas.filter(c => c.id !== contaEmEdicao?.id).map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>)}
            </Select>

            <div className="grid grid-cols-2 gap-4">
                 <Select label="Classificação DRE" name="tipoDRE" value={formState.tipoDRE || 'null'} onChange={handleInputChange}>
                    <option value="null">Não se aplica</option>
                    {Object.values(TipoDRE).map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
                <Select label="Classificação DFC" name="tipoDFC" value={formState.tipoDFC} onChange={handleInputChange}>
                    {Object.values(TipoDFC).map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
                <input
                    type="checkbox"
                    id="isRedutora"
                    name="isRedutora"
                    checked={!!formState.isRedutora}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isRedutora" className="text-sm font-medium text-black">É uma conta redutora?</label>
            </div>


            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
            </div>
        </form>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={handleCloseImportModal} title="Importar Plano de Contas">
        <div className="space-y-4">
            <Alert variant="destructive">
                <AlertCircleIcon className="h-5 w-5" />
                <AlertDescription>
                    <strong className="text-black">Atenção:</strong> Importar um novo plano de contas <strong className="text-black">excluirá permanentemente todos os lançamentos contábeis</strong> existentes nesta empresa para garantir a integridade dos dados.
                </AlertDescription>
            </Alert>
            
            <p className="text-sm text-black">Selecione um arquivo JSON para substituir o plano de contas atual. O sistema tentará inferir a estrutura e a natureza das contas.</p>
            
            <Input type="file" id="import-plano-input" accept=".json" onChange={handleImportFileSelectPlano} />

            {isImportValidating && <div className="flex justify-center p-4"><Spinner /></div>}

            {importValidation && (
                <div className="mt-4 space-y-4">
                    <h4 className="font-semibold text-black">Resultado da Validação: {importValidation.fileName}</h4>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                            <p className="text-sm text-black">Contas Válidas</p>
                            <p className="text-2xl font-bold text-black">{importValidation.novoPlano.length}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
                            <p className="text-sm text-black">Erros Críticos</p>
                            <p className="text-2xl font-bold text-black">{importValidation.errors.length}</p>
                        </div>
                    </div>

                    {importValidation.errors.length > 0 && (
                        <div>
                            <h5 className="font-semibold text-black mb-2 flex items-center gap-2"><AlertCircleIcon className="h-5 w-5 text-rose-500"/> Detalhes dos Erros (Importação Bloqueada):</h5>
                            <div className="max-h-24 overflow-y-auto bg-rose-50 p-3 rounded-md text-sm text-black space-y-1">
                                {importValidation.errors.map((err, i) => <p key={i}>- {err}</p>)}
                            </div>
                        </div>
                    )}
                     {importValidation.warnings.length > 0 && (
                        <div>
                            <h5 className="font-semibold text-black mb-2 flex items-center gap-2"><AlertCircleIcon className="h-5 w-5 text-amber-500"/> Avisos (Importação Permitida):</h5>
                            <div className="max-h-24 overflow-y-auto bg-amber-50 p-3 rounded-md text-sm text-black space-y-1">
                                {importValidation.warnings.map((warn, i) => <p key={i}>- {warn}</p>)}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-blue-200">
                        <Button variant="secondary" onClick={handleCloseImportModal}>Cancelar</Button>
                        <Button 
                            onClick={handleConfirmImportPlano} 
                            disabled={importValidation.novoPlano.length === 0 || importValidation.errors.length > 0}
                        >
                            Importar {importValidation.novoPlano.length} Conta(s)
                        </Button>
                    </div>
                </div>
            )}
        </div>
      </Modal>

    </div>
  );
};

export default PlanoDeContas;