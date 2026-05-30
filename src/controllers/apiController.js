const moment   = require('moment');
const Cliente  = require('../models/Cliente');

exports.listarClientes = async (req, res) => {
    const { busca, tipo, polo, limite = 50 } = req.query;
    const filtro = { arquivado: { $ne: true } };
    if (busca) filtro.$or = [
        { nome: { $regex: busca, $options: 'i' } },
        { cpf:  { $regex: busca, $options: 'i' } },
        { numero_processo: { $regex: busca, $options: 'i' } },
    ];
    if (tipo) filtro.tipo_acao    = tipo;
    if (polo) filtro.polo_cliente = polo;
    const clientes = await Cliente.find(filtro)
        .sort({ createdAt: -1 }).limit(Number(limite))
        .select('nome cpf tipo_acao polo_cliente numero_processo fase_processual createdAt').lean();
    res.json({ ok: true, total: clientes.length, clientes });
};

exports.getCliente = async (req, res) => {
    const cliente = await Cliente.findById(req.params.id).lean();
    if (!cliente) return res.status(404).json({ ok: false, erro: 'Não encontrado.' });
    res.json({ ok: true, cliente });
};

exports.stats = async (req, res) => {
    const [totalClientes, porTipo, porFase, docsHoje] = await Promise.all([
        Cliente.countDocuments({ arquivado: { $ne: true } }),
        Cliente.aggregate([{ $match: { arquivado: { $ne: true } } }, { $group: { _id: '$tipo_acao', total: { $sum: 1 } } }, { $sort: { total: -1 } }]),
        Cliente.aggregate([{ $match: { arquivado: { $ne: true } } }, { $group: { _id: '$fase_processual', total: { $sum: 1 } } }]),
        Cliente.aggregate([{ $unwind: '$docs_gerados' }, { $match: { 'docs_gerados.geradoEm': { $gte: moment().startOf('day').toDate() } } }, { $count: 'total' }]),
    ]);
    res.json({ ok: true, stats: { totalClientes, docsGeradosHoje: docsHoje[0]?.total||0, porTipo, porFase } });
};

exports.prazos = async (req, res) => {
    const dias  = parseInt(req.query.dias||7);
    const hoje  = new Date();
    const limite = moment().add(dias, 'days').toDate();
    const clientes = await Cliente.find({
        arquivado: { $ne: true },
        'prazos.concluido': false,
        'prazos.dataVencimento': { $gte: hoje, $lte: limite },
    }).select('nome numero_processo prazos').lean();
    const prazos = [];
    for (const c of clientes)
        for (const p of c.prazos)
            if (!p.concluido && p.dataVencimento >= hoje && p.dataVencimento <= limite)
                prazos.push({ ...p, clienteNome: c.nome, clienteId: c._id, processo: c.numero_processo });
    prazos.sort((a,b) => new Date(a.dataVencimento)-new Date(b.dataVencimento));
    res.json({ ok: true, total: prazos.length, prazos });
};

exports.calcularPrazo = (req, res) => {
    const { data, dias } = req.query;
    if (!data||!dias) return res.status(400).json({ ok: false, erro: 'Parâmetros: data (YYYY-MM-DD) e dias (número).' });
    const { calcularDiasUteis } = require('../services/documentService');
    res.json({ ok: true, dataBase: data, diasUteis: parseInt(dias), vencimento: calcularDiasUteis(data, parseInt(dias)) });
};
