const PizZip        = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs            = require('fs');
const path          = require('path');
const libre         = require('libreoffice-convert');
const util          = require('util');
const moment        = require('moment');

const convertAsync    = util.promisify(libre.convert);
const PASTA_BASE      = path.join(__dirname, '../../drive_simulado');
const PASTA_TEMPLATES = path.join(__dirname, '../../templates');

// v3: subpastas padrão dentro da pasta de cada cliente
const SUBPASTAS = {
    contrato: '01. Contrato e Procuração',
    peticao:  '02. Petições',
    prova:    '03. Provas',
};

// ── Calcula dias úteis ─────────────────────────────────────────
function calcularDiasUteis(dataISO, prazo) {
    let data = new Date(dataISO + 'T12:00:00');
    let count = 0;
    while (count < prazo) {
        data.setDate(data.getDate() + 1);
        if (data.getDay() !== 0 && data.getDay() !== 6) count++;
    }
    return `${String(data.getDate()).padStart(2,'0')}/${String(data.getMonth()+1).padStart(2,'0')}/${data.getFullYear()}`;
}

// ── Monta dados para injeção nos templates ─────────────────────
function montarDados(cliente, modeloNome = '') {
    const nasc = cliente.data_nascimento ? moment(cliente.data_nascimento) : null;
    let prazo_recurso = '___/___/____';
    if (modeloNome.includes('contrarrazoes') && cliente.data_publicacao_acordao) {
        const dias = modeloNome.includes('inominado') ? 10 : 15;
        prazo_recurso = calcularDiasUteis(
            moment(cliente.data_publicacao_acordao).format('YYYY-MM-DD'), dias
        );
    }
    const rep = cliente.tipo_representacao ? `, neste ato ${cliente.tipo_representacao} ` : '';
    return {
        nome:           cliente.nome          || '',
        cpf:            cliente.cpf           || '',
        rg:             [cliente.rg, cliente.rg_orgao].filter(Boolean).join(' '),
        nacionalidade:  cliente.nacionalidade || 'Brasileiro(a)',
        estado_civil:   cliente.estado_civil  || '',
        profissao:      cliente.profissao     || '',
        endereco:       cliente.endereco      || '',
        cep:            cliente.cep           || '',
        telefone:       cliente.telefone      || '',
        data_nascimento: nasc ? nasc.format('DD/MM/YYYY') : '',
        idade_completa:  nasc ? `nascido em ${nasc.format('DD/MM/YYYY')} e atualmente com ${moment().diff(nasc,'years')} anos de vida` : '',
        tipo_representacao:     rep,
        nome_representante:     cliente.nome_representante     || '',
        cpf_representante:      cliente.cpf_representante      || '',
        telefone_representante: cliente.telefone_representante || '',
        nb:            cliente.nb            || '',
        nit:           cliente.nit           || '',
        der:           cliente.der           ? moment(cliente.der).format('DD/MM/YYYY')           : '',
        data_negativa: cliente.data_negativa ? moment(cliente.data_negativa).format('DD/MM/YYYY') : '',
        negativa:      cliente.negativa      || 'indeferimento indevido',
        doenca:        cliente.detalhes_caso || '',
        numero_processo:          cliente.numero_processo          || '_________________________',
        vara:                     cliente.vara                     || '',
        jurisdicao:               cliente.jurisdicao               || '',
        circunscricao_judiciaria: cliente.circunscricao_judiciaria || '',
        nome_reu:          cliente.nome_reu          || '',
        cnpj_reu:          cliente.cnpj_reu          || '',
        endereco_reu:      cliente.endereco_reu      || '',
        representante_reu: cliente.representante_reu || '',
        id_gratuidade:     cliente.id_gratuidade        || '________',
        id_decisao:        cliente.id_decisao_recorrida || '________',
        prazo_recurso,
        jurisprudencia:    cliente.jurisprudencia   || '',
        jurisprudencia_2:  cliente.jurisprudencia_2 || '',
        jurisprudencia_3:  cliente.jurisprudencia_3 || '',
        jurisprudencia_4:  cliente.jurisprudencia_4 || '',
        honorarios:        cliente.honorarios       || '',
        data_hoje:         moment().format('DD/MM/YYYY'),
        ano_atual:         moment().format('YYYY'),
    };
}

// ── v3: cria hierarquia Ano > Nome > Subpastas ─────────────────
function resolverPastaCliente(cliente) {
    const ano  = moment(cliente.createdAt || new Date()).year();
    const nome = cliente.nome.toUpperCase().replace(/[<>:"/\\|?*]/g, '');
    const dir  = path.join(PASTA_BASE, String(ano), nome);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        Object.values(SUBPASTAS).forEach(sub =>
            fs.mkdirSync(path.join(dir, sub), { recursive: true })
        );
    }
    return dir;
}

// ── v3: resolve subpasta pelo tipo ────────────────────────────
function resolverSubpasta(pastaCliente, tipoDoc) {
    const sub = SUBPASTAS[tipoDoc] || SUBPASTAS.peticao;
    const dir = path.join(pastaCliente, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ── v3: gerador principal — retorna buffer para download ───────
async function criarDocumento(templateNome, dados, pastaDestino, nomeArquivo) {
    const tplPath = path.join(PASTA_TEMPLATES, templateNome);
    if (!fs.existsSync(tplPath)) {
        throw new Error(`Template não encontrado: ${templateNome}. Verifique a pasta /templates.`);
    }
    const content = fs.readFileSync(tplPath, 'binary');
    const zip     = new PizZip(content);
    const doc     = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(dados);
    const buf      = doc.getZip().generate({ type: 'nodebuffer' });
    const docxPath = path.join(pastaDestino, `${nomeArquivo}.docx`);
    if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });
    fs.writeFileSync(docxPath, buf);
    try {
        const pdfBuf = await convertAsync(buf, '.pdf', undefined);
        fs.writeFileSync(path.join(pastaDestino, `${nomeArquivo}.pdf`), pdfBuf);
    } catch (e) {
        console.warn('⚠️  PDF não gerado (LibreOffice ausente?):', e.message);
    }
    // Retorna o buffer para o controller servir como download
    return { docxPath, buf };
}

module.exports = {
    criarDocumento, montarDados,
    resolverPastaCliente, resolverSubpasta,
    calcularDiasUteis, PASTA_BASE, SUBPASTAS,
};
