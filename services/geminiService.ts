import { GoogleGenAI, Type } from "@google/genai";
import { ContaContabil } from "../types";

// Use a singleton pattern to lazy-initialize the AI client.
// This prevents the app from crashing on start if `process.env.API_KEY`
// or the `process` object itself is not available at module load time.
let aiInstance: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiInstance;
}

export async function sugerirContasPorHistorico(
  historico: string,
  contas: ContaContabil[]
): Promise<{ contaDebitoId?: string; contaCreditoId?: string; erro?: string }> {
  if (!historico.trim()) {
    return { erro: "O histórico não pode estar vazio." };
  }

  const contasFormatadas = contas
    .map((c) => `- ID: ${c.id}, Código: ${c.codigo}, Nome: ${c.nome}`)
    .join("\n");

  const prompt = `
    Analise o seguinte fato contábil (histórico): "${historico}".

    Com base na lista de contas contábeis analíticas disponíveis abaixo e nos princípios de partidas dobradas, sugira a conta de DÉBITO e a conta de CRÉDITO mais adequadas.

    Princípios Contábeis Essenciais:
    - O DÉBITO representa: Aumento de Ativo (dinheiro, bens), Aumento de Despesa/Custo, ou Diminuição de Passivo/PL/Receita.
    - O CRÉDITO representa: Aumento de Passivo (dívidas), Aumento de PL, Aumento de Receita, ou Diminuição de Ativo/Despesa/Custo.
    - Analise o fluxo: de onde o valor saiu (crédito) e para onde ele foi (débito).

    Responda apenas com os IDs das contas em formato JSON.

    Lista de Contas Disponíveis:
    ${contasFormatadas}

    Exemplo de fato contábil: "Pagamento de salário do mês de Maio".
    Análise do exemplo: A dívida de 'Salários a Pagar' (Passivo) diminui, então debita-se. O dinheiro do 'Caixa' (Ativo) diminui, então credita-se.
    Exemplo de resposta esperada se as contas fossem "Salários a Pagar (ID: 2.1.2.01)" e "Caixa (ID: 1.1.1.01)":
    {
      "contaDebitoId": "2.1.2.01",
      "contaCreditoId": "1.1.1.01"
    }
    `;

  try {
    const ai = getAiInstance();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contaDebitoId: {
              type: Type.STRING,
              description: "O ID da conta que deve ser debitada.",
            },
            contaCreditoId: {
              type: Type.STRING,
              description: "O ID da conta que deve ser creditada.",
            },
          },
          required: ["contaDebitoId", "contaCreditoId"],
        },
      },
    });

    const textResponse = response.text.trim();
    if (!textResponse) {
        throw new Error("Resposta da IA vazia.");
    }

    const json = JSON.parse(textResponse);
    
    // Validate that the returned IDs exist in the provided list
    const debitoValido = contas.some(c => c.id === json.contaDebitoId);
    const creditoValido = contas.some(c => c.id === json.contaCreditoId);

    if (debitoValido && creditoValido) {
        return json;
    } else {
        return { erro: "A IA retornou IDs de contas inválidos." };
    }

  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    return { erro: "Não foi possível obter a sugestão da IA. Verifique a configuração e tente novamente." };
  }
}

export async function processarComprovanteComIA(
  fileBase64: string,
  mimeType: string,
  contas: ContaContabil[]
): Promise<{ data?: string; historico?: string; valor?: number; contaDebitoId?: string; contaCreditoId?: string; erro?: string }> {
  
  if (!fileBase64 || !mimeType) {
    return { erro: "Arquivo inválido ou não fornecido." };
  }
  
  const contasFormatadas = contas
    .map((c) => `- ID: ${c.id}, Código: ${c.codigo}, Nome: ${c.nome}, Natureza: ${c.natureza}`)
    .join("\n");

  const prompt = `
    Analise a imagem do documento fiscal ou comprovante em anexo. Extraia as seguintes informações:
    1.  **data**: A data da transação no formato AAAA-MM-DD.
    2.  **valor**: O valor total da transação como um número positivo (use ponto como separador decimal).
    3.  **historico**: Uma descrição curta e objetiva da transação (ex: "Compra de material de escritório", "Pagamento de fatura de energia").
    4.  **contaDebitoId**: O ID da conta de DÉBITO mais apropriada.
    5.  **contaCreditoId**: O ID da conta de CRÉDITO mais apropriada.

    Considere a natureza das contas e os princípios de partidas dobradas para fazer a sugestão correta.
    - Débito: Onde o recurso foi aplicado (ex: uma despesa, a compra de um ativo).
    - Crédito: De onde o recurso se originou (ex: saiu do banco, gerou uma dívida com fornecedor).
    Por exemplo, uma compra de material de escritório debita a despesa e credita o caixa/banco.

    Lista de Contas Disponíveis para sugestão:
    ${contasFormatadas}

    Responda apenas com o objeto JSON.
  `;

  try {
    const ai = getAiInstance();
    
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: fileBase64.split(',')[1], // Remove the "data:mime/type;base64," part
      },
    };

    const textPart = {
      text: prompt
    };

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    data: { type: Type.STRING, description: "A data da transação no formato AAAA-MM-DD." },
                    valor: { type: Type.NUMBER, description: "O valor total da transação." },
                    historico: { type: Type.STRING, description: "Descrição da transação." },
                    contaDebitoId: { type: Type.STRING, description: "O ID da conta de débito." },
                    contaCreditoId: { type: Type.STRING, description: "O ID da conta de crédito." }
                },
                required: ["data", "valor", "historico", "contaDebitoId", "contaCreditoId"]
            }
        }
    });
    
    const textResponse = response.text.trim();
    if (!textResponse) {
        throw new Error("Resposta da IA vazia.");
    }
    
    const json = JSON.parse(textResponse);

    const debitoValido = contas.some(c => c.id === json.contaDebitoId);
    const creditoValido = contas.some(c => c.id === json.contaCreditoId);

    if (debitoValido && creditoValido) {
        return json;
    } else {
        return { erro: "A IA sugeriu contas que não existem no plano de contas." };
    }

  } catch (error) {
    console.error("Erro ao chamar a API Gemini para processar comprovante:", error);
    return { erro: "Não foi possível analisar o documento. Verifique o arquivo ou a configuração da IA." };
  }
}