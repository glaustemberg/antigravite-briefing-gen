// Briefing model — defines all sections and their fields

export const BRIEFING_SECTIONS = [
  {
    id: 'ficha',
    number: '⚙️',
    title: 'Ficha Técnica',
    fields: [
      { key: 'titulo', label: 'Título do Projeto', type: 'text', placeholder: 'Nome interno do projeto', required: true },
      { key: 'cliente', label: 'Cliente', type: 'text', placeholder: 'Empresa / Área / Time', required: true },
      { key: 'produto', label: 'Produto / Serviço', type: 'text', placeholder: 'Produto ou serviço específico' },
      { key: 'tipoProjeto', label: 'Tipo de Projeto', type: 'select', options: [
        'Brand Experience', 'Trade Marketing', 'Evento Corporativo', 'Stand / Estande',
        'Campanha Digital', 'Campanha 360', 'Lançamento de Produto', 'Rebranding',
        'Ativação de Marca', 'PDV / Material de Ponto de Venda', 'Outro'
      ]},
      { key: 'praca', label: 'Praça', type: 'text', placeholder: 'Região ou cidade' },
      { key: 'budget', label: 'Budget', type: 'text', placeholder: 'Orçamento disponível' },
      { key: 'prazo', label: 'Prazo Final', type: 'date' },
    ]
  },
  {
    id: 'historico',
    number: '0',
    title: 'Histórico',
    fields: [
      { key: 'historico', label: 'Histórico da marca / produto / serviço', type: 'textarea', placeholder: 'Breve contexto: onde estivemos e onde estamos hoje?' },
    ]
  },
  {
    id: 'escopo',
    number: '1',
    title: 'Escopo da Entrega',
    fields: [
      { key: 'entregavel', label: 'Entregável Principal', type: 'textarea', placeholder: 'Qual é o produto final esperado deste briefing?' },
    ]
  },
  {
    id: 'objetivo',
    number: '2',
    title: 'Objetivo do Projeto',
    fields: [
      { key: 'objetivo', label: 'Objetivo', type: 'textarea', placeholder: 'O que DEVE ser alcançado?' },
      { key: 'problemaCritico', label: 'Problema Crítico', type: 'textarea', placeholder: 'Qual problema será resolvido?' },
      { key: 'comportamentoEsperado', label: 'Comportamento Público Esperado', type: 'textarea', placeholder: 'Que comportamento queremos provocar no público?' },
      { key: 'contexto', label: 'Contexto / Justificativa', type: 'textarea', placeholder: 'Por que este projeto é PRIORITÁRIO agora? Qual gatilho ou dor de mercado?' },
    ]
  },
  {
    id: 'publico',
    number: '3',
    title: 'Público-Alvo',
    fields: [
      { key: 'tipoPublico', label: 'Tipo', type: 'select', options: ['B2C', 'B2B', 'Institucional', 'Trade', 'Colaboradores', 'Misto'] },
      { key: 'demografico', label: 'Demográfico', type: 'text', placeholder: 'Idade, Região, Classe, Cargo' },
      { key: 'comportamento', label: 'Comportamento / Motivadores', type: 'textarea', placeholder: 'Ações e crenças chave do público' },
      { key: 'dores', label: 'Dores e Necessidades', type: 'textarea', placeholder: 'O que os impede de progredir?' },
      { key: 'decisor', label: 'Decisor / Influenciador', type: 'text', placeholder: 'Quem decide? Quem influencia?' },
    ]
  },
  {
    id: 'mensagem',
    number: '4',
    title: 'Mensagem Central',
    fields: [
      { key: 'mensagemUnica', label: 'Mensagem Única', type: 'textarea', placeholder: 'O que o público DEVE entender em UMA frase?' },
      { key: 'acaoDesejada', label: 'Ação / Sentimento Desejado', type: 'textarea', placeholder: 'Que resposta emocional ou ação esperamos?' },
    ]
  },
  {
    id: 'producao',
    number: '5',
    title: 'Escopo e Produção',
    fields: [
      { key: 'listaProducao', label: 'Lista de Produção Obrigatória', type: 'textarea', placeholder: 'Materiais e formatos de entrega obrigatórios' },
    ]
  },
  {
    id: 'kpis',
    number: '6',
    title: 'KPIs',
    fields: [
      { key: 'kpis', label: 'Métricas de Sucesso', type: 'textarea', placeholder: 'Leads, Cadastro, Presença, Vendas, Download, Engajamento...' },
    ]
  },
  {
    id: 'restricoes',
    number: '7',
    title: 'Restrições e Premissas',
    fields: [
      { key: 'compliance', label: 'Compliance / LGPD', type: 'textarea', placeholder: 'Regras inegociáveis' },
      { key: 'limitacoesLegais', label: 'Limitações Legais', type: 'text', placeholder: 'Restrições legais aplicáveis' },
      { key: 'limitacoesCriativas', label: 'Limitações Criativas', type: 'text', placeholder: 'O que é proibido ou restrito pela marca?' },
      { key: 'datasRestritas', label: 'Datas Restritas', type: 'text', placeholder: 'Datas que devem ser evitadas' },
    ]
  },
  {
    id: 'responsaveis',
    number: '8',
    title: 'Responsáveis & Stakeholders',
    fields: [
      { key: 'po', label: 'Responsável Cliente (P.O.)', type: 'text', placeholder: 'Principal ponto de contato' },
      { key: 'atendimento', label: 'Atendimento', type: 'text', placeholder: 'Nome do atendimento' },
      { key: 'produtor', label: 'Produtor', type: 'text', placeholder: 'Nome do produtor' },
      { key: 'liderProjeto', label: 'Líder de Projeto', type: 'text', placeholder: 'Nome do líder' },
      { key: 'squadCriativo', label: 'Squad Criativo', type: 'text', placeholder: 'Nomes do time criativo' },
    ]
  },
  {
    id: 'info',
    number: '9',
    title: 'Informações Técnicas',
    fields: [
      { key: 'infoTecnicas', label: 'Links e Referências', type: 'textarea', placeholder: 'Cronograma, PIT, Guide de Marca, Histórico de resultados...' },
    ]
  },
]

export function createEmptyBriefingData() {
  const data = {}
  BRIEFING_SECTIONS.forEach(section => {
    section.fields.forEach(field => {
      data[field.key] = ''
    })
  })
  return data
}

export function calculateCompleteness(formData) {
  const allFields = BRIEFING_SECTIONS.flatMap(s => s.fields)
  const filled = allFields.filter(f => formData[f.key]?.trim?.())
  return Math.round((filled.length / allFields.length) * 100)
}

export function getSectionCompleteness(section, formData) {
  const filled = section.fields.filter(f => formData[f.key]?.trim?.())
  return Math.round((filled.length / section.fields.length) * 100)
}
