const PizZip        = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs            = require('fs');
const path          = require('path');
const libre         = require('libreoffice-convert');
const util          = require('util');
const moment        = require('moment');
const he            = require('he');

const convertAsync    = util.promisify(libre.convert);
const PASTA_BASE      = path.resolve(process.cwd(), 'drive_simulado');
const PASTA_TEMPLATES = path.resolve(process.cwd(), 'templates');

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
function humanizeTemplateName(templateNome) {
    if (!templateNome || typeof templateNome !== 'string') return '';
    const rawName = templateNome.replace(/\.(docx|doc)$/i, '').replace(/^(rotina_|peticao_)/i, '');
    const label = rawName
        .replace(/_/g, ' ')
        .replace(/\b([a-z])/g, (m) => m.toUpperCase())
        .replace(/\bCrps\b/i, 'CRPS')
        .replace(/\bInss\b/i, 'INSS')
        .replace(/\bTnu\b/i, 'TNU')
        .replace(/\bStj\b/i, 'STJ')
        .replace(/\bStf\b/i, 'STF');
    return label;
}

function isTemplateType(templateNome, prefix) {
    return typeof templateNome === 'string' && templateNome.toLowerCase().startsWith(prefix);
}

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
    const normalizedTemplate = modeloNome ? modeloNome.toLowerCase() : '';
    let nomePeticao;
    if (isTemplateType(normalizedTemplate, 'rotina_')) {
        nomePeticao = `Petição de ${humanizeTemplateName(modeloNome)}`;
    } else if (normalizedTemplate === 'peticao_generica.docx' || normalizedTemplate === 'peticao_generica') {
        nomePeticao = cliente.tipo_acao ? `Petição de ${cliente.tipo_acao}` : 'Petição Inicial';
    } else if (isTemplateType(normalizedTemplate, 'peticao_')) {
        nomePeticao = `Petição Inicial - ${humanizeTemplateName(modeloNome)}`;
    } else {
        nomePeticao = cliente.tipo_acao ? `Petição de ${cliente.tipo_acao}` : humanizeTemplateName(modeloNome);
    }
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
        tese_judicial:     cliente.tese_judicial    || '',
        tese_administrativa: cliente.tese_administrativa || '',
        honorarios:        cliente.honorarios       || '',
        data_hoje:         moment().format('DD/MM/YYYY'),
        ano_atual:         moment().format('YYYY'),
        nome_peticao:      nomePeticao,
        // Disponibiliza tipo de ação para templates (chave usada nos .docx)
        tipo_acao:         (cliente.tipo_acao || '').toString(),
        TIPO_ACAO:         (cliente.tipo_acao || '').toString(),
    };
}

// ── Normaliza runs no document.xml para juntar placeholders divididos ──
function normalizeRunsInZip(zip) {
    try {
        const file = zip.file('word/document.xml');
        if (!file) return;
        let xml = file.asText();
        const runRe = /<w:r[\s\S]*?<\/w:r>/g;
        const runs = [];
        let m;
        while ((m = runRe.exec(xml)) !== null) {
            const textRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
            let tMatch; let plain = '';
            while ((tMatch = textRe.exec(m[0])) !== null) {
                plain += tMatch[1];
            }
            runs.push({ start: m.index, end: runRe.lastIndex, xml: m[0], plain: plain });
        }
        if (runs.length === 0) return;
        // Busca sequências de runs que, concatenadas, contenham um placeholder {name}
        const replacements = [];
        for (let i = 0; i < runs.length; i++) {
            let combined = runs[i].plain || '';
            if (combined.includes('{') && combined.includes('}')) continue; // já contém tag inteira
            let j = i + 1;
            while (j < runs.length && !(combined.includes('{') && combined.includes('}'))) {
                combined += runs[j].plain || '';
                j++;
            }
            if (combined.includes('{') && combined.includes('}')) {
                // Merge runs from i..j-1
                const firstRun = runs[i].xml;
                // Preserve first run's <w:rPr> if present
                const rPrMatch = firstRun.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
                const rPr = rPrMatch ? rPrMatch[0] : '';
                const mergedText = he.escape(combined);
                const mergedRun = `<w:r>${rPr}<w:t xml:space="preserve">${mergedText}</w:t></w:r>`;
                replacements.push({ fromStart: runs[i].start, fromEnd: runs[j - 1].end, xml: mergedRun });
                i = j - 1; // advance
            }
        }
        if (replacements.length === 0) return;
        // Aplica substituições em ordem reversa para não invalidar índices
        let newXml = xml;
        for (let k = replacements.length - 1; k >= 0; k--) {
            const r = replacements[k];
            newXml = newXml.slice(0, r.fromStart) + r.xml + newXml.slice(r.fromEnd);
        }
        zip.file('word/document.xml', newXml);
    } catch (e) {
        // Falha silente — não bloqueara geração, apenas não normalizará
        console.warn('[docx] normalizeRunsInZip falhou:', e && e.message);
    }
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
        const err = new Error(`Template não encontrado: ${templateNome}. Verifique a pasta /templates.`);
        err.status = 404;
        throw err;
    }
    const content = fs.readFileSync(tplPath);
    const zip     = new PizZip(content);

    // Normaliza runs que possam ter dividido placeholders (ex: {tipo_acao})
    //normalizeRunsInZip(zip);

    const doc     = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });

    // Logging condicional: ativar via DEBUG_DOCX=1 ou quando NODE_ENV != 'production'
    const enableLog = process.env.DEBUG_DOCX === '1' || process.env.NODE_ENV !== 'production';
    try {
        const tipo = (dados && (dados.tipo_acao || dados.TIPO_ACAO)) ? (dados.tipo_acao || dados.TIPO_ACAO) : '';
        if (enableLog) {
            const logLine = `${new Date().toISOString()} render start template=${templateNome} tipo_acao=${tipo}\n`;
            try { fs.appendFileSync('/tmp/docx_render.log', logLine); } catch (e) { /* ignore */ }
            try { fs.appendFileSync(path.join(__dirname, '../../docx_render.log'), logLine); } catch (e) { /* ignore */ }
            console.log('[docx] render start', templateNome, 'tipo_acao=', tipo);
        }
        doc.render(dados);
        if (enableLog) {
            try { fs.appendFileSync('/tmp/docx_render.log', `${new Date().toISOString()} render ok template=${templateNome}\n`); } catch (e) {}
            try { fs.appendFileSync(path.join(__dirname, '../../docx_render.log'), `${new Date().toISOString()} render ok template=${templateNome}\n`); } catch (e) {}
            console.log('[docx] render ok', templateNome);
        }
    } catch (e) {
        if (enableLog) {
            try { fs.appendFileSync('/tmp/docx_render.log', `${new Date().toISOString()} render error template=${templateNome} err=${e.message}\n`); } catch (ee) {}
            try { fs.appendFileSync(path.join(__dirname, '../../docx_render.log'), `${new Date().toISOString()} render error template=${templateNome} err=${e.message}\n`); } catch (ee) {}
        }
        console.error('[docx] render error', e);
        throw e;
    }
    const buf = doc.getZip().generate({ 
        type: 'nodebuffer',
        compression: "DEFLATE" 
    });
    const docxPath = path.join(pastaDestino, `${nomeArquivo}.docx`);
    if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });
    fs.writeFileSync(docxPath, buf);
    if (!process.env.SKIP_PDF) {
        try {
            const pdfBuf = await convertAsync(buf, '.pdf', '--headless --invisible --nodefault --nofirststartwizard --nolockcheck --nologo --norestore --no-sandbox');
            fs.writeFileSync(path.join(pastaDestino, `${nomeArquivo}.pdf`), pdfBuf);
        } catch (e) {
            console.warn('⚠️  PDF não gerado (LibreOffice ausente?):', e.message);
        }
    }
    // Retorna o buffer para o controller servir como download
    return { docxPath, buf };
}

module.exports = {
    criarDocumento, montarDados,
    resolverPastaCliente, resolverSubpasta,
    calcularDiasUteis, PASTA_BASE, SUBPASTAS,
};
