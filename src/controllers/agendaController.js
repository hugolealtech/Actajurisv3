const moment  = require('moment');
const Cliente = require('../models/Cliente');

exports.agenda = async (req, res) => {
    const hoje    = moment().startOf('day').toDate();
    const em7d    = moment().add(7,  'days').endOf('day').toDate();
    const em30d   = moment().add(30, 'days').endOf('day').toDate();

    const clientesComPrazo = await Cliente.find({
        arquivado: { $ne: true },
        'prazos.concluido': false,
        'prazos.dataVencimento': { $gte: hoje },
    }).select('nome numero_processo tipo_acao prazos').lean();

    const vencidos = [], urgentes = [], proximos = [], futuros = [];
    for (const c of clientesComPrazo) {
        for (const p of c.prazos) {
            if (p.concluido) continue;
            const venc = moment(p.dataVencimento);
            const item = { ...p, clienteNome: c.nome, clienteId: c._id,
                           processo: c.numero_processo, tipo_acao: c.tipo_acao,
                           diasRestantes: venc.diff(moment(), 'days') };
            if (venc.isBefore(moment()))           vencidos.push(item);
            else if (venc.isSameOrBefore(em7d))    urgentes.push(item);
            else if (venc.isSameOrBefore(em30d))   proximos.push(item);
            else                                    futuros.push(item);
        }
    }

    const { dataBase, diasUteis } = req.query;
    let resultadoCalculo = null;
    if (dataBase && diasUteis) {
        const { calcularDiasUteis } = require('../services/documentService');
        resultadoCalculo = calcularDiasUteis(dataBase, parseInt(diasUteis));
    }

    res.render('agenda', { vencidos, urgentes, proximos, futuros,
                           dataBase: dataBase||'', diasUteis: diasUteis||'', resultadoCalculo });
};
