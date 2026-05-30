const moment  = require('moment');
const path    = require('path');
const fs      = require('fs');
const Cliente = require('../models/Cliente');
const {
    criarDocumento, montarDados,
    resolverPastaCliente, resolverSubpasta,
} = require('../services/documentService');

const TEMPLATES_PETICAO = {
    'Auxílio Doença':                   'peticao_auxilio_doenca.docx',
    'Aposentadoria Invalidez':          'peticao_aposentadoria_invalidez.docx',
    'Aposentadoria Idade Urbana':       'peticao_aposentadoria_urbana.docx',
    'Aposentadoria Rural':              'peticao_aposentadoria_rural.docx',
    'Aposentadoria Especial':           'peticao_aposentadoria_especial.docx',
    'Aposentadoria Tempo Contribuição': 'peticao_aposentadoria_tc.docx',
    'Aposentadoria Pessoa Deficiência': 'peticao_aposentadoria_deficiencia.docx',
    'Aposentadoria Híbrida':            'peticao_aposentadoria_hibrida.docx',
    'BPC/LOAS':                         'peticao_loas_deficiente.docx',
    'Pensão por Morte':                 'peticao_pensao_morte.docx',
    'Salário Maternidade':              'peticao_salario_maternidade.docx',
    'Auxílio Acidentário':              'peticao_auxilio_acidentario.docx',
    'Revisão da Vida Toda':             'peticao_revisao_vida_toda.docx',
    'Revisão de Benefício':             'peticao_revisao_beneficio.docx',
    'Petição Teste':                    'peticao_teste.docx',
};

// ── Dashboard ──────────────────────────────────────────────────
exports.dashboard = async (req, res) => {
    const { busca, tipo, polo, fase } = req.query;
    const filtro = { arquivado: { $ne: true } };
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
        Cliente.countDocuments({ arquivado: { $ne: true } }),
        Cliente.aggregate([
            { $match: { arquivado: { $ne: true } } },
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
        clientes, porTipo,
        busca: busca||'', tipo: tipo||'', polo: polo||'', fase: fase||'',
        kpis: {
            totalClientes:  total,
            docsHoje:       docsHoje[0]?.total || 0,
            prazosUrgentes: prazosUrgentes.length,
            semProcesso:    clientes.filter(c => !c.numero_processo).length,
        },
    });
};

exports.novo = (req, res) => res.render('novo');

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
    res.render('details', { cliente });
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
    const { buf }      = await criarDocumento(templateArquivo, dados, subpasta, nomeArquivo);

    cliente.docs_gerados.push({ tipo: tipoTimeline, arquivo: nomeArquivo, template: templateArquivo });
    await cliente.save();

    // v3: download direto no navegador do usuário
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nomeArquivo)}.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buf);
}

exports.gerarPeticao = async (req, res) => {
    const cliente         = await Cliente.findById(req.params.id).lean();
    if (!cliente) throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });
    const templateArquivo = TEMPLATES_PETICAO[cliente.tipo_acao] || 'peticao_generica.docx';
    const nomeArquivo     = `PETICAO INICIAL - ${(cliente.tipo_acao||'GERAL').toUpperCase()}`;
    await gerarEServir(req, res, { templateArquivo, nomeArquivo, tipoDoc: 'peticao', tipoTimeline: 'peticao' });
};

exports.gerarRotina = async (req, res) => {
    const { modelo_rotina } = req.body;
    const nomeArquivo = `ROTINA - ${modelo_rotina.replace('.docx','').replace('rotina_','').toUpperCase().replace(/_/g,' ')}`;
    await gerarEServir(req, res, { templateArquivo: modelo_rotina, nomeArquivo, tipoDoc: 'peticao', tipoTimeline: 'rotina' });
};

exports.gerarLote = async (req, res) => {
    const { modelos } = req.body;
    const cliente     = await Cliente.findById(req.params.id);
    if (!cliente) throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });
    const lista        = Array.isArray(modelos) ? modelos : [modelos];
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
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(buffers[0].nome)}.docx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(arquivo)}.docx"`);
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
