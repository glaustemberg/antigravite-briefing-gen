// Google Gemini API wrapper for briefing generation

const BRIEFING_TEMPLATE = `Você é um especialista em planejamento estratégico de agências de comunicação.
Gere um briefing completo e profissional seguindo EXATAMENTE a estrutura abaixo.
Preencha cada seção com informações detalhadas, relevantes e acionáveis.
Use as informações fornecidas pelo atendimento, documentos enviados e histórico do cliente.
Se alguma informação não foi fornecida, faça sugestões inteligentes baseadas no contexto.
Escreva em português brasileiro profissional.

ESTRUTURA DO BRIEFING:

===== BRIEFING: PLANO DE AÇÃO ESTRATÉGICO =====

FICHA TÉCNICA:
- Título do Projeto: [nome interno do projeto]
- Cliente: [empresa / área / time responsável]
- Produto / Serviço: [produto ou serviço específico]
- Tipo de Projeto: [Brand Experience / Trade Marketing / Evento Corporativo / Stand / etc.]
- Praça: [região ou cidade]
- Budget: [orçamento disponível]
- Prazo Final: [data limite]

0. HISTÓRICO
[Breve histórico da marca, produto e/ou serviço. Onde estivemos e onde estamos?]

1. ESCOPO DA ENTREGA
[Qual é o entregável PRINCIPAL? O que esperamos como produto final deste briefing?]

2. OBJETIVO DO PROJETO
[O que DEVE ser alcançado? Qual problema CRÍTICO será resolvido? Qual é o comportamento PÚBLICO ESPERADO?]

2.1 CONTEXTO / JUSTIFICATIVA
[Por que este projeto é PRIORITÁRIO agora? Qual o GATILHO ou DOR de mercado?]

3. PÚBLICO-ALVO
- Tipo: [B2C / B2B / Institucional / Trade / Colaboradores]
- Demográfico: [Idade, Região, Classe, Cargo]
- Comportamento / Motivadores: [Ações e Crenças Chave]
- Dores e Necessidades: [O que os impede de progredir?]
- Decisor / Influenciador: [Quem decide vs. quem sugere]

4. MENSAGEM CENTRAL
- Mensagem Única: [O que o público DEVE entender em UMA frase]
- Ação/Sentimento Desejado: [Resposta emocional ou ação esperada]

5. ESCOPO E PRODUÇÃO
[Lista de Produção OBRIGATÓRIA: materiais e formatos de entrega]

6. KPIs (MÉTRICAS DE SUCESSO)
[Métricas Chave: Leads, Cadastro, Presença, Vendas, Download, Engajamento, etc.]

7. RESTRIÇÕES E PREMISSAS
- Compliance / LGPD: [Regras Inegociáveis]
- Limitações Legais: [restrições legais]
- Limitações Criativas: [O que é proibido ou restrito pela marca]
- Datas Restritas: [datas que devem ser evitadas]

8. RESPONSÁVEIS & STAKEHOLDERS
- Responsável Cliente (P.O.): [principal ponto de contato]
- Atendimento: [nome]
- Produtor: [nome]
- Líder de Projeto: [nome]
- Squad Criativo: [nome]

9. INFORMAÇÕES TÉCNICAS
[Listar links e referências relevantes]
`

export async function generateBriefing(apiKey, { formData, freeText, filesContent, clientHistory }) {
  if (!apiKey) {
    throw new Error('API Key do Gemini não configurada. Acesse as configurações para adicionar sua chave.')
  }

  let userPrompt = 'Com base nas informações abaixo, gere o briefing completo:\n\n'

  // Add form data
  if (formData) {
    userPrompt += '=== DADOS DO FORMULÁRIO ===\n'
    for (const [key, value] of Object.entries(formData)) {
      if (value && value.trim()) {
        userPrompt += `${key}: ${value}\n`
      }
    }
    userPrompt += '\n'
  }

  // Add free text from the team
  if (freeText && freeText.trim()) {
    userPrompt += '=== NOTAS DO ATENDIMENTO ===\n'
    userPrompt += freeText + '\n\n'
  }

  // Add extracted file contents
  if (filesContent && filesContent.length > 0) {
    userPrompt += '=== CONTEÚDO DOS DOCUMENTOS ENVIADOS ===\n'
    for (const fc of filesContent) {
      userPrompt += `--- ${fc.name} ---\n${fc.text}\n\n`
    }
  }

  // Add client history
  if (clientHistory && clientHistory.trim()) {
    userPrompt += '=== HISTÓRICO DO CLIENTE ===\n'
    userPrompt += clientHistory + '\n\n'
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: BRIEFING_TEMPLATE },
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            topP: 0.95,
          }
        })
      }
    )

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || `Erro da API: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('A API não retornou conteúdo. Tente novamente.')
    }

    return text
  } catch (err) {
    if (err.message.includes('API key not valid')) {
      throw new Error('API Key inválida. Verifique sua chave do Gemini nas configurações.')
    }
    throw err
  }
}

// Extract structured field values from uploaded documents
export async function extractFieldsFromFiles(apiKey, filesContent) {
  if (!apiKey || !filesContent.length) return {}

  const fieldNames = 'titulo, cliente, produto, tipoProjeto, praca, budget, prazo, historico, entregavel, objetivo, problemaCritico, comportamentoEsperado, contexto, tipoPublico, demografico, comportamento, dores, decisor, mensagemUnica, acaoDesejada, listaProducao, kpis, compliance, limitacoesLegais, limitacoesCriativas, datasRestritas, po, atendimento, produtor, liderProjeto, squadCriativo, infoTecnicas'

  const prompt = `Analise os documentos abaixo e extraia informações para preencher um briefing de agência de comunicação.
Retorne APENAS um JSON válido (sem markdown, sem bloco de código) com os campos que conseguir identificar com clareza.
Use EXATAMENTE estes nomes de campo (inclua apenas os que tiver informação clara):

${fieldNames}

DOCUMENTOS:
${filesContent.map(f => `--- ${f.name} ---\n${f.text}`).join('\n\n')}

Retorne apenas o JSON:`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        })
      }
    )
    if (!response.ok) return {}
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {}
  }
}
