export enum NaturezaConta {
  ATIVO = 'Ativo',
  PASSIVO = 'Passivo',
  PL = 'Patrimônio Líquido',
  RECEITA = 'Receita',
  DESPESA = 'Despesa',
  CUSTO = 'Custo'
}

export enum TipoConta {
  SINTETICA = 'Sintética',
  ANALITICA = 'Analítica',
}

export enum TipoDRE {
    RECEITA_BRUTA = 'Receita Bruta',
    DEDUCAO_RECEITA = 'Dedução da Receita Bruta',
    CUSTO_PRODUTO_SERVICO = 'Custo de Produto/Serviço Vendido',
    DESPESA_OPERACIONAL = 'Despesa Operacional',
    RECEITA_FINANCEIRA = 'Receita Financeira',
    DESPESA_FINANCEIRA = 'Despesa Financeira',
    OUTRAS_RECEITAS = 'Outras Receitas',
    OUTRAS_DESPESAS = 'Outras Despesas',
    IR_CSLL = 'Imposto de Renda e CSLL',
}

export enum TipoDFC {
    FCO = 'FCO - Fluxo de Caixa Operacional',
    FCI = 'FCI - Fluxo de Caixa de Investimento',
    FCF = 'FCF - Fluxo de Caixa de Financiamento',
    NAO_SE_APLICA = 'Não se Aplica',
}

export interface User {
    id: string;
    nomeCompleto: string;
    email: string;
    // In a real app, this MUST be a secure hash (e.g., from bcrypt).
    // Storing plain text is a major security vulnerability.
    password: string; 
    telefone?: string;
    createdAt: string; // ISO date string
}

export interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  natureza: NaturezaConta;
  tipo: TipoConta;
  paiId?: string | null;
  isRedutora: boolean;
  tipoDRE: TipoDRE | null;
  tipoDFC: TipoDFC;
}

export interface Partida {
  contaId: string;
  tipo: 'D' | 'C'; // Débito ou Crédito
  valor: number;
}

export interface LancamentoContabil {
  id:string;
  data: string; // YYYY-MM-DD
  historico: string;
  partidas: Partida[];
  comprovantePdf?: string; // Armazena a string base64 do PDF
  isDeleted?: boolean; // Para exclusão lógica
  isEncerramento?: boolean; // Para identificar lançamentos de apuração/fechamento
}

export interface Empresa {
  id: string;
  userId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  responsavel: string;
  telefone: string;
  email: string;
  regimeTributario: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
  porte: 'MEI' | 'ME' | 'EPP' | 'Média' | 'Grande';
  inicioExercicio: string; // YYYY-MM-DD
  planoDeContas: ContaContabil[];
  lancamentos: LancamentoContabil[];
}

export interface SaldosConta {
    saldoInicial: number;
    totalDebitos: number;
    totalCreditos: number;
    saldoFinal: number;
}

export interface MovimentacaoConta {
    totalDebitos: number;
    totalCreditos: number;
    netChange: number;
}