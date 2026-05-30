const mongoose = require('mongoose');
const execucaoSchema = new mongoose.Schema({
    cliente:                 { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true, unique: true },
    contra_fazenda:          { type: Boolean, default: false },
    data_transito:           { type: Date },
    valor_principal:         { type: Number },
    data_atualizacao:        { type: Date },
    indice_correcao:         { type: String, default: 'INPC' },
    termo_inicial_juros:     { type: String },
    taxa_juros:              { type: String, default: '1% a.m.' },
    honorarios_conhecimento: { type: Number },
}, { timestamps: true });
module.exports = mongoose.model('Execucao', execucaoSchema);
