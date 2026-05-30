const mongoose = require('mongoose');

const docGeradoSchema = new mongoose.Schema({
    tipo:     { type: String },
    arquivo:  { type: String },
    template: { type: String },
    geradoEm: { type: Date, default: Date.now },
}, { _id: false });

const anotacaoSchema = new mongoose.Schema({
    texto:    { type: String, required: true },
    criadaEm: { type: Date, default: Date.now },
}, { _id: true });

const prazoSchema = new mongoose.Schema({
    descricao:      { type: String },
    dataVencimento: { type: Date },
    tipo:           { type: String, enum: ['recurso','protocolo','audiencia','outro'], default: 'outro' },
    concluido:      { type: Boolean, default: false },
    criadoEm:       { type: Date, default: Date.now },
}, { _id: true });

const clienteSchema = new mongoose.Schema({
    nome:             { type: String, required: true, trim: true },
    cpf:              { type: String, trim: true },
    rg:               { type: String, trim: true },
    rg_orgao:         { type: String, trim: true },
    nacionalidade:    { type: String, default: 'Brasileiro(a)' },
    estado_civil:     { type: String },
    profissao:        { type: String },
    data_nascimento:  { type: Date },
    endereco:         { type: String },
    cep:              { type: String },
    telefone:         { type: String },
    polo_cliente:           { type: String, default: 'Autor' },
    tipo_representacao:     { type: String },
    nome_representante:     { type: String },
    cpf_representante:      { type: String },
    telefone_representante: { type: String },
    tipo_acao:  { type: String },
    honorarios: { type: String },
    nb:            { type: String },
    der:           { type: Date },
    nit:           { type: String },
    negativa:      { type: String },
    data_negativa: { type: Date },
    detalhes_caso: { type: String },
    numero_processo:          { type: String },
    vara:                     { type: String },
    jurisdicao:               { type: String },
    circunscricao_judiciaria: { type: String },
    fase_processual: { type: String, enum: ['administrativa','judicial_1grau','recursal','execucao','encerrado'], default: 'administrativa' },
    nome_reu:          { type: String },
    cnpj_reu:          { type: String },
    endereco_reu:      { type: String },
    representante_reu: { type: String },
    data_publicacao_acordao: { type: Date },
    id_gratuidade:           { type: String },
    id_decisao_recorrida:    { type: String },
    jurisprudencia:   { type: String },
    jurisprudencia_2: { type: String },
    jurisprudencia_3: { type: String },
    jurisprudencia_4: { type: String },
    docs_gerados: [docGeradoSchema],
    anotacoes:    [anotacaoSchema],
    prazos:       [prazoSchema],
    arquivado:    { type: Boolean, default: false },
}, { timestamps: true });

clienteSchema.index({ nome: 'text', cpf: 1, numero_processo: 1 });
module.exports = mongoose.model('Cliente', clienteSchema);
