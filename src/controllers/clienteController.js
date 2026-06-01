const moment  = require('moment');
const path    = require('path');
const fs      = require('fs');
const Cliente = require('../models/Cliente');
const {
    criarDocumento, montarDados,
    resolverPastaCliente, resolverSubpasta,
} = require('../services/documentService');

const TEMPLATES_DIR = path.join(__dirname, '../../templates');

const TIPO_ACAO_OPTIONS = [
    {
        label: 'Auxílios',
        options: [
            { value: 'Auxílio Doença', label: 'Auxílio Doença' },
            { value: 'Auxílio Acidentário', label: 'Auxílio Acidentário' },
            { value: 'Auxílio Reclusão', label: 'Auxílio Reclusão' },
            { value: 'Salário Maternidade', label: 'Salário Maternidade' },
        ]
    },
    {
        label: 'Aposentadorias',
        options: [
            { value: 'Aposentadoria Invalidez', label: 'Aposentadoria por Invalidez' },
            { value: 'Aposentadoria Idade Urbana', label: 'Aposentadoria por Idade (Urbana)' },
            { value: 'Aposentadoria Rural', label: 'Aposentadoria Rural' },
            { value: 'Aposentadoria Especial', label: 'Aposentadoria Especial' },
            { value: 'Aposentadoria Tempo Contribuição', label: 'Aposentadoria por Tempo de Contribuição' },
            { value: 'Aposentadoria Pessoa Deficiência', label: 'Aposentadoria da Pessoa com Deficiência' },
            { value: 'Aposentadoria Híbrida', label: 'Aposentadoria Híbrida' },
        ]
    },
    {
        label: 'Pensões',
        options: [
            { value: 'Pensão por Morte', label: 'Pensão por Morte' },
        ]
    },
    {
        label: 'Benefícios Assistenciais',
        options: [
            { value: 'BPC/LOAS', label: 'BPC / LOAS' },
        ]
    },
    {
        label: 'Revisões e Planejamento',
        options: [
            { value: 'Revisão da Vida Toda', label: 'Revisão da Vida Toda' },
            { value: 'Revisão de Benefício', label: 'Revisão de Benefício' },
            { value: 'Revisão do Teto', label: 'Revisão do Teto' },
            { value: 'Planejamento Previdenciário', label: 'Planejamento Previdenciário' },
            { value: 'Averbação de Tempo', label: 'Averbação de Tempo' },
            { value: 'Averbação', label: 'Averbação' },
            { value: 'Cálculo de Benefício', label: 'Cálculo de Benefício' },
        ]
    },
    {
        label: 'Recursos e Agravos',
        options: [
            { value: 'Recurso Ordinário', label: 'Recurso Ordinário' },
            { value: 'Recurso Especial', label: 'Recurso Especial' },
            { value: 'Recurso Extraordinário', label: 'Recurso Extraordinário' },
            { value: 'Agravo Interno', label: 'Agravo Interno' },
            { value: 'Agravo Interno TRF', label: 'Agravo Interno TRF' },
            { value: 'Agravo em Recurso Especial', label: 'Agravo em Recurso Especial' },
            { value: 'Agravo em Recurso Extraordinário', label: 'Agravo em Recurso Extraordinário' },
        ]
    },
    {
        label: 'Administrativo',
        options: [
            { value: 'Pedido de Reconsideração', label: 'Pedido de Reconsideração' },
            { value: 'Requerimento Administrativo', label: 'Requerimento Administrativo' },
            { value: 'Recurso Administrativo', label: 'Recurso Administrativo' },
            { value: 'Notificação / Ofício de Restabelecimento', label: 'Notificação / Ofício de Restabelecimento' },
            { value: 'Pedido de Cumprimento de Decisão Administrativa', label: 'Pedido de Cumprimento de Decisão Administrativa' },
            { value: 'Restabelecimento de Benefício', label: 'Restabelecimento de Benefício' },
        ]
    },
    {
        label: 'Mandados',
        options: [
            { value: 'Mandado de Segurança', label: 'Mandado de Segurança' },
        ]
    },
];

const PRAZO_TIPOS = [
    { value: 'recurso', label: 'Recurso' },
    { value: 'protocolo', label: 'Protocolo' },
    { value: 'audiencia', label: 'Audiência' },
    { value: 'outro', label: 'Outro' },
];

const TEMPLATES_PETICAO = {
    'Auxílio Doença':                   'peticao_auxilio_doenca.docx',
    'Aposentadoria Invalidez':          'peticao_aposentadoria_invalidez.docx',
    'Aposentadoria Idade Urbana':       'peticao_aposentadoria_urbana.docx',
    'Aposentadoria Rural':              'peticao_aposentadoria_rural.docx',
    'Aposentadoria Especial':           'peticao_aposentadoria_especial.docx',
    'Aposentadoria Tempo Contribuição': 'peticao_aposentadoria_tempo_contribuicao.docx',
    'Aposentadoria Tempo de Contribuição': 'peticao_aposentadoria_tc.docx',
    'Aposentadoria TC':                  'peticao_aposentadoria_tc.docx',
    'Aposentadoria Pessoa Deficiência': 'peticao_aposentadoria_deficiencia.docx',
    'Aposentadoria Híbrida':            'peticao_aposentadoria_hibrida.docx',
    'BPC/LOAS':                         'peticao_loas_deficiente.docx',
    'LOAS Idoso':                       'peticao_loas_idoso.docx',
    'Pensão por Morte':                 'peticao_pensao_morte.docx',
    'Salário Maternidade':              'peticao_salario_maternidade.docx',
    'Auxílio Acidentário':              'peticao_auxilio_acidentario.docx',
    'Auxílio Reclusão':                 'peticao_auxilio_reclusao.docx',
    'Revisão da Vida Toda':             'peticao_revisao_vida_toda.docx',
    'Revisão de Benefício':             'peticao_revisao_beneficio.docx',
    'Planejamento Previdenciário':      'peticao_planejamento.docx',
    'Averbação de Tempo':               'peticao_averbacao_tempo.docx',
    'Averbação':                        'peticao_averbacao.docx',
    'Cálculo de Benefício':             'peticao_calculo_beneficio.docx',
    'Conversão de Tempo Rural':         'peticao_conversao_tempo_rural.docx',
    'Embargos de Declaração':           'peticao_embargos_declaracao.docx',
    'Isenção IR':                       'peticao_isencao_ir.docx',
    'Pedido de Reconsideração':         'peticao_reconsideracao_administrativa.docx',
    'Requerimento Administrativo':      'peticao_requerimento_administrativo.docx',
    'Restabelecimento de Benefício':    'peticao_restabelecimento_beneficio.docx',
    'Revisão do Teto':                  'peticao_revisao_teto.docx',
    'Recurso Ordinário':                'peticao_recurso_ordinario.docx',
    'Agravamento de Instrumento':       'peticao_agravamento_instrumento.docx',
    'Agravo Interno':                   'peticao_agravo_interno.docx',
    'Agravo Interno TRF':               'peticao_agravo_interno_trf1.docx',
    'Recurso Especial':                 'peticao_recurso_especial.docx',
    'Recurso Extraordinário':           'peticao_recurso_extraordinario.docx',
    'Agravo em Recurso Especial':       'peticao_agravo_recurso_especial.docx',
    'Agravo em Recurso Extraordinário': 'peticao_agravo_recurso_extraordinario.docx',
    'Mandado de Segurança':             'peticao_mandado_seguranca.docx',
    'Recurso Administrativo':           'peticao_recurso_administrativo.docx',
    'Notificação / Ofício de Restabelecimento': 'peticao_notificacao_restabelecimento.docx',
    'Pedido de Cumprimento de Decisão Administrativa': 'peticao_pedido_cumprimento_decisao_administrativa.docx',
};

function normalizeTemplateName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
}

function resolverTemplatePeticao(tipoAcao) {
    if (!tipoAcao || typeof tipoAcao !== 'string') return 'peticao_generica.docx';
    if (TEMPLATES_PETICAO[tipoAcao]) return TEMPLATES_PETICAO[tipoAcao];
    const candidate = `peticao_${normalizeTemplateName(tipoAcao)}.docx`;
    return fs.existsSync(path.join(TEMPLATES_DIR, candidate)) ? candidate : 'peticao_generica.docx';
}

exports.dashboard = async (req, res) => {
    const { busca, tipo, polo, fase, arquivados } = req.query;
    const filtro = arquivados ? { arquivado: true } : { arquivado: { $ne: true } };
    if (busca) filtro.$or = [
        { nome:            { $regex: busca, $options: 'i' } },
        { cpf:             { $regex: busca, $options: 'i' } },
        { numero_processo: { $regex: busca, $options: 'i' } },
    ];
    if (tipo)  filtro.tipo_acao       = tipo;
    if (polo)  filtro.polo_cliente    = polo;
    if (fase)  filtro.fase_processual = fase;

    const [clientes, total, porTipo, prazosUrgentes] = await Promise.all([
        Cliente.find(filtro).sort({ createdAt: -1 }).lean(),
        Cliente.countDocuments(filtro),
        Cliente.aggregate([
            { $match: filtro },
            { $group: { _id: '$tipo_acao', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        Cliente.find({
            arquivado: { $ne: true },
            'prazos.concluido': false,
            'prazos.dataVencimento': { $gte: new Date(), $lte: moment().add(7,'days').toDate() },
        }).select('nome prazos').lean(),
    ]);

    const docsHoje = await Cliente.aggregate([
        { $unwind: '$docs_gerados' },
        { $match: { 'docs_gerados.geradoEm': { $gte: moment().startOf('day').toDate() } } },
        { $count: 'total' },
    ]);

    res.render('index', {
        clientes, porTipo,        tipoAcaoOptions: TIPO_ACAO_OPTIONS,        busca: busca||'', tipo: tipo||'', polo: polo||'', fase: fase||'', arquivados: !!arquivados,
        kpis: {
            totalClientes:  total,
            docsHoje:       docsHoje[0]?.total || 0,
            prazosUrgentes: prazosUrgentes.length,
            semProcesso:    clientes.filter(c => !c.numero_processo).length,
        },
    });
};

exports.novo = (req, res) => res.render('novo', { tipoAcaoOptions: TIPO_ACAO_OPTIONS });

// ── Criar cliente — v3: estrutura de pastas organizada ─────────
exports.criar = async (req, res) => {
    const d = req.body;
    const endereco = d.endereco_rua
        ? `${d.endereco_rua}${d.endereco_complemento ? ', '+d.endereco_complemento : ''}`
        : (d.endereco || '');

    const cliente = await Cliente.create({
        nome: d.nome, cpf: d.cpf, rg: d.rg, rg_orgao: d.rg_orgao,
        nacionalidade: d.nacionalidade || 'Brasileiro(a)',
        estado_civil: d.estado_civil, profissao: d.profissao,
        data_nascimento: d.data_nascimento || null,
        endereco, cep: d.cep, telefone: d.telefone,
        polo_cliente: d.polo_cliente || 'Autor',
        tipo_representacao: d.tipo_representacao,
        nome_representante: d.nome_representante,
        cpf_representante:  d.cpf_representante,
        tipo_acao: d.tipo_acao, honorarios: d.honorarios,
    });

    try {
        const pastaCliente  = resolverPastaCliente(cliente.toObject());
        const pastaContrato = resolverSubpasta(pastaCliente, 'contrato');
        const dados         = montarDados(cliente.toObject());
        const iniciais      = [
            ['modelo_procuracao.docx',       'Procuracao'],
            ['modelo_contrato.docx',         'Contrato'],
            ['modelo_hipossuficiencia.docx', 'Hipossuficiencia'],
        ];
        for (const [tpl, nome] of iniciais) {
            await criarDocumento(tpl, dados, pastaContrato, nome);
            cliente.docs_gerados.push({ tipo: 'contrato', arquivo: nome, template: tpl });
        }
        await cliente.save();
    } catch (e) {
        console.warn('⚠️  Templates iniciais não encontrados:', e.message);
    }
    res.redirect('/');
};

exports.detalhe = async (req, res) => {
    const cliente = await Cliente.findById(req.params.id).lean();
    if (!cliente) return res.render('error', { titulo: 'Não encontrado', mensagem: 'Dossiê inexistente.' });
    if (cliente.docs_gerados) cliente.docs_gerados.sort((a,b) => new Date(b.geradoEm)-new Date(a.geradoEm));
    if (cliente.prazos)       cliente.prazos.sort((a,b) => new Date(a.dataVencimento)-new Date(b.dataVencimento));
    res.render('details', { cliente, tipoAcaoOptions: TIPO_ACAO_OPTIONS, prazoTipos: PRAZO_TIPOS });
};

exports.editarForm = async (req, res) => {
    const cliente = await Cliente.findById(req.params.id).lean();
    if (!cliente) return res.render('error', { titulo: 'Não encontrado', mensagem: 'Dossiê inexistente.' });
    res.render('edit', { cliente });
};

exports.editar = async (req, res) => {
    const { nome, cpf, rg, rg_orgao, estado_civil, profissao, endereco, cep, telefone } = req.body;
    await Cliente.findByIdAndUpdate(req.params.id, { nome, cpf, rg, rg_orgao, estado_civil, profissao, endereco, cep, telefone });
    res.redirect(`/clientes/${req.params.id}?status=sucesso`);
};

exports.atualizarTese = async (req, res) => {
    await Cliente.findByIdAndUpdate(req.params.id, { tipo_acao: req.body.tipo_acao });
    res.redirect(`/clientes/${req.params.id}`);
};

exports.complementar = async (req, res) => {
    const d = req.body;
    await Cliente.findByIdAndUpdate(req.params.id, {
        estado_civil: d.estado_civil, profissao: d.profissao,
        data_nascimento: d.data_nascimento||null, cep: d.cep,
        polo_cliente: d.polo_cliente,
        tipo_representacao: d.tipo_representacao, nome_representante: d.nome_representante,
        cpf_representante: d.cpf_representante, telefone_representante: d.telefone_representante,
        nb: d.nb, der: d.der||null, nit: d.nit,
        negativa: d.negativa, data_negativa: d.data_negativa||null,
        detalhes_caso: d.detalhes_caso,
        numero_processo: d.numero_processo, vara: d.vara, jurisdicao: d.jurisdicao,
        circunscricao_judiciaria: d.circunscricao_judiciaria, fase_processual: d.fase_processual,
        nome_reu: d.nome_reu, cnpj_reu: d.cnpj_reu,
        endereco_reu: d.endereco_reu, representante_reu: d.representante_reu,
        data_publicacao_acordao: d.data_publicacao_acordao||null,
        id_gratuidade: d.id_gratuidade, id_decisao_recorrida: d.id_decisao_recorrida,
        jurisprudencia: d.jurisprudencia, jurisprudencia_2: d.jurisprudencia_2,
        jurisprudencia_3: d.jurisprudencia_3, jurisprudencia_4: d.jurisprudencia_4,
        tese_judicial: d.tese_judicial, tese_administrativa: d.tese_administrativa,
    });
    res.redirect(`/clientes/${req.params.id}?status=sucesso`);
};

exports.arquivar = async (req, res) => {
    const c = await Cliente.findById(req.params.id);
    await Cliente.findByIdAndUpdate(req.params.id, { arquivado: !c.arquivado });
    res.redirect(`/clientes/${req.params.id}`);
};

exports.excluir = async (req, res) => {
    await Cliente.findByIdAndDelete(req.params.id);
    res.redirect('/');
};

// ── v3: função central — gera documento e serve como download ──
async function gerarEServir(req, res, { templateArquivo, nomeArquivo, tipoDoc, tipoTimeline }) {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });

    const pastaCliente = resolverPastaCliente(cliente.toObject());
    const subpasta     = resolverSubpasta(pastaCliente, tipoDoc);
    const dados        = montarDados(cliente.toObject(), templateArquivo);
    let buf;
    try {
        ({ buf } = await criarDocumento(templateArquivo, dados, subpasta, nomeArquivo));
    } catch (e) {
        const err = new Error(`Falha ao gerar documento "${nomeArquivo}": ${e.message}`);
        err.status = e.status || 400;
        throw err;
    }

    cliente.docs_gerados.push({ tipo: tipoTimeline, arquivo: nomeArquivo, template: templateArquivo });
    await cliente.save();

    // v3: download direto no navegador, normatizado para RFC 5987 e com tamanho estrito
    res.setHeader('Content-Disposition', `attachment; filename="documento.docx"; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
}

exports.gerarPeticao = async (req, res) => {
    const cliente         = await Cliente.findById(req.params.id).lean();
    if (!cliente) throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });
    const templateArquivo = resolverTemplatePeticao(cliente.tipo_acao);
    const nomeArquivo     = `PETICAO INICIAL - ${(cliente.tipo_acao||'GERAL').toUpperCase()}`;
    await gerarEServir(req, res, { templateArquivo, nomeArquivo, tipoDoc: 'peticao', tipoTimeline: 'peticao' });
};

exports.gerarRotina = async (req, res) => {
    const { modelo_rotina } = req.body;
    if (!modelo_rotina || typeof modelo_rotina !== 'string') {
        throw Object.assign(new Error('Selecione um modelo de rotina válido.'), { status: 400 });
    }
    const nomeArquivo = `ROTINA - ${modelo_rotina.replace('.docx','').replace('rotina_','').toUpperCase().replace(/_/g,' ')}`;
    await gerarEServir(req, res, { templateArquivo: modelo_rotina, nomeArquivo, tipoDoc: 'peticao', tipoTimeline: 'rotina' });
};

exports.gerarLote = async (req, res) => {
    const { modelos } = req.body;
    const cliente     = await Cliente.findById(req.params.id);
    if (!cliente) throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });
    const lista        = Array.isArray(modelos) ? modelos : (modelos ? [modelos] : []);
    if (lista.length === 0) {
        throw Object.assign(new Error('Selecione ao menos um modelo para gerar em lote.'), { status: 400 });
    }
    const pastaCliente = resolverPastaCliente(cliente.toObject());
    const subpasta     = resolverSubpasta(pastaCliente, 'peticao');
    const gerados      = [];
    const buffers      = [];
    for (const modelo of lista) {
        const dados   = montarDados(cliente.toObject(), modelo);
        const arquivo = `ROTINA - ${modelo.replace('.docx','').replace('rotina_','').toUpperCase().replace(/_/g,' ')}`;
        const { buf } = await criarDocumento(modelo, dados, subpasta, arquivo);
        cliente.docs_gerados.push({ tipo: 'rotina', arquivo, template: modelo });
        gerados.push(arquivo);
        buffers.push({ nome: arquivo, buf });
    }
    await cliente.save();
    if (buffers.length === 1) {
        // v3: download direto no navegador, normatizado para RFC 5987 e com tamanho estrito
        res.setHeader('Content-Disposition', `attachment; filename="documento.docx"; filename*=UTF-8''${encodeURIComponent(buffers[0].nome)}.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Length', buffers[0].buf.length);
        return res.send(buffers[0].buf);
    }
    res.render('success_lote', { cliente: cliente.toObject(), gerados });
};

// ── v3: re-download de documento já gerado ─────────────────────
exports.download = async (req, res) => {
    const cliente = await Cliente.findById(req.params.id).lean();
    if (!cliente) return res.status(404).send('Cliente não encontrado.');
    const { arquivo, tipo } = req.query;
    if (!arquivo) return res.status(400).send('Parâmetro "arquivo" obrigatório.');
    const tipoDoc      = tipo === 'contrato' ? 'contrato' : 'peticao';
    const pastaCliente = resolverPastaCliente(cliente);
    const subpasta     = resolverSubpasta(pastaCliente, tipoDoc);
    const filePath     = path.join(subpasta, `${arquivo}.docx`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send(`Arquivo "${arquivo}.docx" não encontrado no servidor.`);
    }
    
    // Normatizado para RFC 5987: preserva acentuação e espaços no nome do arquivo
    res.setHeader('Content-Disposition', `attachment; filename="documento.docx"; filename*=UTF-8''${encodeURIComponent(arquivo)}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.sendFile(filePath);
};

// ── Anotações ──────────────────────────────────────────────────
exports.adicionarAnotacao = async (req, res) => {
    const { texto } = req.body;
    if (!texto||!texto.trim()) return res.redirect(`/clientes/${req.params.id}#anotacoes`);
    await Cliente.findByIdAndUpdate(req.params.id, { $push: { anotacoes: { texto: texto.trim() } } });
    res.redirect(`/clientes/${req.params.id}?status=sucesso#anotacoes`);
};
exports.excluirAnotacao = async (req, res) => {
    await Cliente.findByIdAndUpdate(req.params.id, { $pull: { anotacoes: { _id: req.params.aid } } });
    res.redirect(`/clientes/${req.params.id}#anotacoes`);
};

// ── Prazos ─────────────────────────────────────────────────────
exports.adicionarPrazo = async (req, res) => {
    const { descricao, dataVencimento, tipo } = req.body;
    await Cliente.findByIdAndUpdate(req.params.id, { $push: { prazos: { descricao, dataVencimento, tipo } } });
    res.redirect(`/clientes/${req.params.id}?status=sucesso#prazos`);
};
exports.concluirPrazo = async (req, res) => {
    await Cliente.findOneAndUpdate(
        { _id: req.params.id, 'prazos._id': req.params.pid },
        { $set: { 'prazos.$.concluido': true } }
    );
    res.redirect(`/clientes/${req.params.id}#prazos`);
};
exports.excluirPrazo = async (req, res) => {
    await Cliente.findByIdAndUpdate(req.params.id, { $pull: { prazos: { _id: req.params.pid } } });
    res.redirect(`/clientes/${req.params.id}#prazos`);
};
