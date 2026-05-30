const Cliente  = require('../models/Cliente');
const Execucao = require('../models/Execucao');

exports.form = async (req, res) => {
    const cliente  = await Cliente.findById(req.params.id).lean();
    if (!cliente) return res.render('error', { titulo: 'Não encontrado', mensagem: 'Dossiê inexistente.' });
    const execucao = await Execucao.findOne({ cliente: req.params.id }).lean() || {};
    res.render('cumprimento', { cliente, execucao });
};

exports.salvar = async (req, res) => {
    const { id } = req.params;
    const { contra_fazenda, data_transito, valor_principal, data_atualizacao,
            indice_correcao, termo_inicial_juros, taxa_juros, honorarios_conhecimento } = req.body;
    await Execucao.findOneAndUpdate(
        { cliente: id },
        { cliente: id, contra_fazenda: contra_fazenda === '1',
          data_transito: data_transito||null, valor_principal: valor_principal||null,
          data_atualizacao: data_atualizacao||null,
          indice_correcao, termo_inicial_juros, taxa_juros,
          honorarios_conhecimento: honorarios_conhecimento||null },
        { upsert: true, new: true }
    );
    res.redirect(`/clientes/${id}/cumprimento?status=sucesso`);
};
