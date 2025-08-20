import React, { createContext, useReducer, useEffect } from 'react';
import { Empresa, ContaContabil, LancamentoContabil, NaturezaConta, TipoConta, User } from '../types';
import { PLANO_DE_CONTAS_PADRAO } from '../constants';

interface State {
  users: User[];
  currentUserId: string | null;
  empresas: Empresa[];
  empresaSelecionadaId: string | null;
}

type Action =
  | { type: 'REGISTER_USER'; payload: User }
  | { type: 'LOGIN'; payload: { userId: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_STATE'; payload: State }
  | { type: 'ADD_EMPRESA'; payload: Empresa }
  | { type: 'UPDATE_EMPRESA'; payload: Empresa }
  | { type: 'DELETE_EMPRESA'; payload: { empresaId: string } }
  | { type: 'SELECT_EMPRESA'; payload: string | null }
  | { type: 'ADD_LANCAMENTO'; payload: { empresaId: string, lancamento: LancamentoContabil } }
  | { type: 'ADD_LANCAMENTOS_BATCH'; payload: { empresaId: string, lancamentos: LancamentoContabil[] } }
  | { type: 'UPDATE_LANCAMENTO'; payload: { empresaId: string, lancamento: LancamentoContabil } }
  | { type: 'DELETE_LANCAMENTO'; payload: { empresaId: string, lancamentoId: string } }
  | { type: 'RESTORE_LANCAMENTO'; payload: { empresaId: string, lancamentoId: string } }
  | { type: 'ADD_CONTA'; payload: { empresaId: string, conta: ContaContabil } }
  | { type: 'UPDATE_CONTA'; payload: { empresaId: string, conta: ContaContabil } }
  | { type: 'DELETE_CONTA'; payload: { empresaId: string, contaId: string } }
  | { type: 'REPLACE_PLANO_DE_CONTAS'; payload: { empresaId: string, novoPlano: ContaContabil[] } }
  | { type: 'RESET_PLANO_DE_CONTAS'; payload: { empresaId: string } }
  | { type: 'DESFAZER_APURACAO'; payload: { empresaId: string } };


const initialState: State = {
  users: [],
  currentUserId: null,
  empresas: [],
  empresaSelecionadaId: null,
};

function contabilidadeReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STATE':
        return action.payload;
    case 'REGISTER_USER':
        return { ...state, users: [...state.users, action.payload] };
    case 'LOGIN':
        return { ...state, currentUserId: action.payload.userId };
    case 'LOGOUT':
      return { ...state, currentUserId: null, empresaSelecionadaId: null };
    case 'ADD_EMPRESA':
      return { ...state, empresas: [...state.empresas, action.payload] };
    case 'UPDATE_EMPRESA':
        return {
            ...state,
            empresas: state.empresas.map(emp =>
                emp.id === action.payload.id ? action.payload : emp
            ),
        };
    case 'DELETE_EMPRESA': {
        const { empresaId } = action.payload;
        const novasEmpresas = state.empresas.filter(emp => emp.id !== empresaId);
        return {
            ...state,
            empresas: novasEmpresas,
            empresaSelecionadaId: state.empresaSelecionadaId === empresaId ? null : state.empresaSelecionadaId,
        };
    }
    case 'SELECT_EMPRESA':
      return { ...state, empresaSelecionadaId: action.payload };
    case 'ADD_LANCAMENTO': {
      const { empresaId, lancamento } = action.payload;
      return {
        ...state,
        empresas: state.empresas.map(emp =>
          emp.id === empresaId
            ? { ...emp, lancamentos: [...emp.lancamentos, lancamento] }
            : emp
        ),
      };
    }
    case 'ADD_LANCAMENTOS_BATCH': {
      const { empresaId, lancamentos } = action.payload;
      return {
        ...state,
        empresas: state.empresas.map(emp =>
          emp.id === empresaId
            ? { ...emp, lancamentos: [...emp.lancamentos, ...lancamentos] }
            : emp
        ),
      };
    }
    case 'UPDATE_LANCAMENTO': {
        const { empresaId, lancamento } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp =>
                emp.id === empresaId
                ? { ...emp, lancamentos: emp.lancamentos.map(l => l.id === lancamento.id ? lancamento : l) }
                : emp
            ),
        };
    }
    case 'DELETE_LANCAMENTO': {
        const { empresaId, lancamentoId } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp =>
                emp.id === empresaId
                ? { ...emp, lancamentos: emp.lancamentos.map(l => l.id === lancamentoId ? { ...l, isDeleted: true } : l) }
                : emp
            ),
        };
    }
     case 'RESTORE_LANCAMENTO': {
        const { empresaId, lancamentoId } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp =>
                emp.id === empresaId
                ? { ...emp, lancamentos: emp.lancamentos.map(l => l.id === lancamentoId ? { ...l, isDeleted: false } : l) }
                : emp
            ),
        };
    }
    case 'ADD_CONTA': {
        const { empresaId, conta } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp =>
                emp.id === empresaId
                ? { ...emp, planoDeContas: [...emp.planoDeContas, conta] }
                : emp
            )
        }
    }
    case 'UPDATE_CONTA': {
        const { empresaId, conta } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp =>
                emp.id === empresaId
                ? { ...emp, planoDeContas: emp.planoDeContas.map(c => c.id === conta.id ? conta : c) }
                : emp
            )
        }
    }
    case 'DELETE_CONTA': {
        const { empresaId, contaId } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp => {
                if (emp.id === empresaId) {
                    return { ...emp, planoDeContas: emp.planoDeContas.filter(c => c.id !== contaId) };
                }
                return emp;
            })
        }
    }
     case 'REPLACE_PLANO_DE_CONTAS': {
      const { empresaId, novoPlano } = action.payload;
      return {
        ...state,
        empresas: state.empresas.map(emp => {
          if (emp.id === empresaId) {
            return { ...emp, planoDeContas: novoPlano, lancamentos: [] }; // Reset launches
          }
          return emp;
        })
      };
    }
    case 'RESET_PLANO_DE_CONTAS': {
        const { empresaId } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp => {
                if (emp.id === empresaId) {
                    return { ...emp, planoDeContas: PLANO_DE_CONTAS_PADRAO };
                }
                return emp;
            })
        }
    }
    case 'DESFAZER_APURACAO': {
        const { empresaId } = action.payload;
        return {
            ...state,
            empresas: state.empresas.map(emp => {
                if (emp.id === empresaId) {
                    const lancamentosFiltrados = emp.lancamentos.filter(l => !l.isEncerramento);
                    return { ...emp, lancamentos: lancamentosFiltrados };
                }
                return emp;
            })
        }
    }
    default:
      return state;
  }
}

interface ContabilidadeContextProps {
  state: State;
  dispatch: React.Dispatch<Action>;
  isAuthenticated: boolean;
  currentUser: User | null;
  empresas: Empresa[];
  empresaSelecionada: Empresa | null;
  registerUser: (userData: Omit<User, 'id' | 'createdAt'>) => { success: boolean, message: string };
  login: (email: string, password: string) => { success: boolean, message: string };
  logout: () => void;
  addEmpresa: (empresa: Omit<Empresa, 'id' | 'planoDeContas' | 'lancamentos' | 'userId'>) => void;
  updateEmpresa: (empresa: Empresa) => void;
  deleteEmpresa: (empresaId: string) => void;
  selecionarEmpresa: (id: string | null) => void;
  addLancamento: (lancamento: Omit<LancamentoContabil, 'id' | 'isDeleted' | 'isEncerramento'>) => void;
  addLancamentosBatch: (lancamentos: Omit<LancamentoContabil, 'id' | 'isDeleted'>[]) => void;
  updateLancamento: (lancamento: LancamentoContabil) => void;
  deleteLancamento: (lancamentoId: string) => void;
  restoreLancamento: (lancamentoId: string) => void;
  desfazerApuracao: () => void;
  addConta: (conta: Omit<ContaContabil, 'id'>) => { success: boolean, message: string };
  updateConta: (conta: ContaContabil) => { success: boolean, message: string };
  deleteConta: (contaId: string) => { success: boolean; message: string };
  resetPlanoDeContas: () => void;
  replacePlanoDeContas: (novoPlano: ContaContabil[]) => void;
}

export const ContabilidadeContext = createContext<ContabilidadeContextProps | undefined>(undefined);

export const ContabilidadeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(contabilidadeReducer, initialState, (initial) => {
    try {
        const localData = localStorage.getItem('contabilidadeState');
        if (localData) {
            const parsed = JSON.parse(localData);
            // Verify that the parsed state has the expected structure
            if (parsed && typeof parsed.users !== 'undefined' && typeof parsed.empresas !== 'undefined') {
                 return parsed;
            }
        }
        return initial;
    } catch (error) {
        console.error("Could not parse local storage state, resetting to initial.", error);
        return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem('contabilidadeState', JSON.stringify(state));
  }, [state]);

  const isAuthenticated = !!state.currentUserId;
  const currentUser = state.users.find(u => u.id === state.currentUserId) || null;
  const empresas = state.empresas.filter(e => e.userId === state.currentUserId);
  const empresaSelecionada = state.empresaSelecionadaId
    ? empresas.find(e => e.id === state.empresaSelecionadaId) || null
    : null;
    
  // Effect to auto-select the first company on login if none is selected
  useEffect(() => {
    if (isAuthenticated && empresas.length > 0 && !empresaSelecionada) {
      dispatch({ type: 'SELECT_EMPRESA', payload: empresas[0].id });
    }
  }, [isAuthenticated, empresas, empresaSelecionada, dispatch]);

  const registerUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const emailExists = state.users.some(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (emailExists) {
        return { success: false, message: "Este e-mail já está cadastrado." };
    }

    const newUser: User = {
        ...userData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
    };

    dispatch({ type: 'REGISTER_USER', payload: newUser });
    return { success: true, message: "Usuário cadastrado com sucesso!" };
  }

  const login = (email: string, password: string): { success: boolean, message: string } => {
    const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return { success: false, message: "E-mail ou senha inválidos." };
    }
    // In a real app, you would compare a hashed password. e.g., await bcrypt.compare(password, user.passwordHash)
    if (user.password !== password) {
        return { success: false, message: "E-mail ou senha inválidos." };
    }
    dispatch({ type: 'LOGIN', payload: { userId: user.id } });
    return { success: true, message: "Login bem-sucedido!" };
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };
  
  const addEmpresa = (empresaData: Omit<Empresa, 'id'|'userId'|'planoDeContas'|'lancamentos'>) => {
    if (!state.currentUserId) return;
    const novaEmpresa: Empresa = {
      ...empresaData,
      id: crypto.randomUUID(),
      userId: state.currentUserId,
      planoDeContas: PLANO_DE_CONTAS_PADRAO,
      lancamentos: [],
    };
    dispatch({ type: 'ADD_EMPRESA', payload: novaEmpresa });
    dispatch({ type: 'SELECT_EMPRESA', payload: novaEmpresa.id });
  };
  
  const updateEmpresa = (empresa: Empresa) => {
    dispatch({ type: 'UPDATE_EMPRESA', payload: empresa });
  };

  const deleteEmpresa = (empresaId: string) => {
    dispatch({ type: 'DELETE_EMPRESA', payload: { empresaId } });
  };

  const selecionarEmpresa = (id: string | null) => {
    dispatch({ type: 'SELECT_EMPRESA', payload: id });
  };

  const addLancamento = (lancamentoData: Omit<LancamentoContabil, 'id' | 'isDeleted'| 'isEncerramento'>) => {
    if (!state.empresaSelecionadaId) return;
    const novoLancamento: LancamentoContabil = {
      ...lancamentoData,
      id: crypto.randomUUID(),
      isDeleted: false,
      isEncerramento: false,
    };
    dispatch({ type: 'ADD_LANCAMENTO', payload: { empresaId: state.empresaSelecionadaId, lancamento: novoLancamento } });
  };

  const addLancamentosBatch = (lancamentosData: Omit<LancamentoContabil, 'id' | 'isDeleted'>[]) => {
      if (!state.empresaSelecionadaId) return;
      const novosLancamentos: LancamentoContabil[] = lancamentosData.map((l) => ({
          ...l,
          id: crypto.randomUUID(),
          isDeleted: false
      }));
      dispatch({ type: 'ADD_LANCAMENTOS_BATCH', payload: { empresaId: state.empresaSelecionadaId, lancamentos: novosLancamentos } });
  }
  
  const updateLancamento = (lancamento: LancamentoContabil) => {
    if (!state.empresaSelecionadaId) return;
    dispatch({ type: 'UPDATE_LANCAMENTO', payload: { empresaId: state.empresaSelecionadaId, lancamento }});
  };

  const deleteLancamento = (lancamentoId: string) => {
    if (!state.empresaSelecionadaId) return;
    dispatch({ type: 'DELETE_LANCAMENTO', payload: { empresaId: state.empresaSelecionadaId, lancamentoId }});
  };

  const restoreLancamento = (lancamentoId: string) => {
      if (!state.empresaSelecionadaId) return;
      dispatch({ type: 'RESTORE_LANCAMENTO', payload: { empresaId: state.empresaSelecionadaId, lancamentoId }});
  };

  const desfazerApuracao = () => {
    if (!empresaSelecionada) return;
    dispatch({ type: 'DESFAZER_APURACAO', payload: { empresaId: empresaSelecionada.id } });
  }
  
  const addConta = (contaData: Omit<ContaContabil, 'id'>): { success: boolean, message: string } => {
    if (!empresaSelecionada) return { success: false, message: "Nenhuma empresa selecionada." };
    
    const { planoDeContas } = empresaSelecionada;
    const { paiId, natureza, tipo, tipoDRE, codigo } = contaData;

    if (paiId) {
        const parent = planoDeContas.find(c => c.id === paiId);
        if (parent && parent.natureza !== natureza) {
            return { success: false, message: `A natureza da conta (${natureza}) deve ser a mesma da conta pai (${parent.natureza}).` };
        }
    }

    if (tipo === TipoConta.ANALITICA && !paiId) {
        return { success: false, message: 'Contas analíticas devem obrigatoriamente pertencer a uma conta sintética.' };
    }

    const isResultAccount = [NaturezaConta.RECEITA, NaturezaConta.CUSTO, NaturezaConta.DESPESA].includes(natureza);
    if (isResultAccount && !tipoDRE) {
        return { success: false, message: "Contas de resultado (Receita, Custo, Despesa) devem ter uma classificação para a DRE." };
    }
    if (!isResultAccount && tipoDRE) {
        return { success: false, message: "Apenas contas de resultado podem ter uma classificação para a DRE." };
    }

    const codigoExists = planoDeContas.some(c => c.codigo === codigo);
    if(codigoExists) {
        return { success: false, message: `O código da conta '${codigo}' já existe.` };
    }

    const novaConta: ContaContabil = {
        ...contaData,
        id: crypto.randomUUID(),
    };
    dispatch({ type: 'ADD_CONTA', payload: { empresaId: empresaSelecionada.id, conta: novaConta } });
    return { success: true, message: "Conta adicionada." };
  }
  
  const updateConta = (conta: ContaContabil): { success: boolean, message: string } => {
    if (!empresaSelecionada) return { success: false, message: "Nenhuma empresa selecionada." };

    const { planoDeContas } = empresaSelecionada;
    const { id, paiId, natureza, tipo, tipoDRE, codigo } = conta;

    // Check for circular dependencies
    const isCircularDependency = (contaId: string, novoPaiId: string | null | undefined): boolean => {
        if (!novoPaiId) return false;
        if (contaId === novoPaiId) return true; // Cannot be its own parent
        let currentId: string | null | undefined = novoPaiId;
        while (currentId) {
            const parent = planoDeContas.find(c => c.id === currentId);
            if (!parent) break;
            if (parent.id === contaId) return true;
            currentId = parent.paiId;
        }
        return false;
    };
    if (isCircularDependency(id, paiId)) {
        return { success: false, message: "Dependência circular detectada. Uma conta não pode ser filha de si mesma ou de uma de suas descendentes." };
    }

    if (paiId) {
        const parent = planoDeContas.find(c => c.id === paiId);
        if (parent && parent.natureza !== natureza) {
            return { success: false, message: `A natureza da conta (${natureza}) deve ser a mesma da conta pai (${parent.natureza}).` };
        }
        if (parent && parent.tipo === TipoConta.ANALITICA) {
            return { success: false, message: "Uma conta analítica não pode ser definida como conta pai." };
        }
    }

    if (tipo === TipoConta.ANALITICA && !paiId) {
        return { success: false, message: 'Contas analíticas devem obrigatoriamente pertencer a uma conta sintética.' };
    }
    
    const hasChildren = planoDeContas.some(c => c.paiId === id);
    if (tipo === TipoConta.ANALITICA && hasChildren) {
        return { success: false, message: "Não é possível alterar para 'Analítica' uma conta que já possui contas filhas." };
    }

    const isResultAccount = [NaturezaConta.RECEITA, NaturezaConta.CUSTO, NaturezaConta.DESPESA].includes(natureza);
    if (isResultAccount && !tipoDRE) {
        return { success: false, message: "Contas de resultado (Receita, Custo, Despesa) devem ter uma classificação para a DRE." };
    }
    if (!isResultAccount && tipoDRE) {
        return { success: false, message: "Apenas contas de resultado podem ter uma classificação para a DRE." };
    }
    
    const codigoExists = planoDeContas.some(c => c.codigo === codigo && c.id !== id);
    if(codigoExists) {
        return { success: false, message: `O código da conta '${codigo}' já pertence a outra conta.` };
    }
    
    dispatch({ type: 'UPDATE_CONTA', payload: { empresaId: empresaSelecionada.id, conta } });
    return { success: true, message: "Conta atualizada." };
  };

  const deleteConta = (contaId: string): { success: boolean, message: string } => {
      if (!empresaSelecionada) return { success: false, message: "Nenhuma empresa selecionada." };
      
      const { planoDeContas, lancamentos } = empresaSelecionada;
      
      const hasChildren = planoDeContas.some(c => c.paiId === contaId);
      if (hasChildren) {
          return { success: false, message: "Não é possível excluir uma conta sintética que possui contas filhas." };
      }
      
      const isInUse = lancamentos.some(l => l.partidas.some(p => p.contaId === contaId));
      if (isInUse) {
          return { success: false, message: "Não é possível excluir uma conta que já possui lançamentos." };
      }

      dispatch({ type: 'DELETE_CONTA', payload: { empresaId: empresaSelecionada.id, contaId } });
      return { success: true, message: "Conta excluída com sucesso." };
  };

  const resetPlanoDeContas = () => {
      if (!empresaSelecionada) return;
      dispatch({ type: 'RESET_PLANO_DE_CONTAS', payload: { empresaId: empresaSelecionada.id } });
  };
  
  const replacePlanoDeContas = (novoPlano: ContaContabil[]) => {
    if (!empresaSelecionada) return;
    // The confirmation is now handled in the UI modal, removing the redundant and problematic window.confirm here.
    dispatch({ type: 'REPLACE_PLANO_DE_CONTAS', payload: { empresaId: empresaSelecionada.id, novoPlano } });
  };


  return (
    <ContabilidadeContext.Provider value={{ 
        state, dispatch, isAuthenticated, currentUser, empresas, empresaSelecionada,
        registerUser, login, logout, addEmpresa, updateEmpresa, deleteEmpresa, 
        selecionarEmpresa, addLancamento, addLancamentosBatch, updateLancamento, deleteLancamento, restoreLancamento, 
        desfazerApuracao, addConta, updateConta, deleteConta, resetPlanoDeContas, replacePlanoDeContas
    }}>
      {children}
    </ContabilidadeContext.Provider>
  );
};