const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const ds = require('../src/services/documentService');

async function main() {
    const templatesDir = path.join(__dirname, '../templates');
    if (!fs.existsSync(templatesDir)) {
        console.error('Pasta templates/ não encontrada.');
        process.exit(2);
    }
    const files = fs.readdirSync(templatesDir).filter(f => f.toLowerCase().endsWith('.docx'));
    if (files.length === 0) {
        console.log('Nenhum template .docx encontrado em templates/.');
        process.exit(0);
    }

    const cliente = {
        nome: 'CLIENTE DE TESTE',
        tipo_acao: 'Auxílio Doença',
        createdAt: new Date(),
        data_nascimento: '1980-01-01'
    };

    const results = [];

    for (const tpl of files) {
        // Ignorar arquivos temporários do Word (~$...)
        if (tpl.startsWith('~$')) continue;
        process.stdout.write(`Verificando ${tpl} ... `);
        try {
            const dados = ds.montarDados(cliente, tpl);
            const pastaTmp = path.join('/tmp', 'verify_templates');
            if (!fs.existsSync(pastaTmp)) fs.mkdirSync(pastaTmp, { recursive: true });
            const nomeArquivo = `VERIFY-${path.parse(tpl).name}`;
            const r = await ds.criarDocumento(tpl, dados, pastaTmp, nomeArquivo);
            const zip = new PizZip(r.buf);
            const docFile = zip.file('word/document.xml');
            const xml = docFile ? docFile.asText() : '';

            const hasValue = dados.tipo_acao && dados.tipo_acao.length > 0 && xml.includes(dados.tipo_acao);
            const hasPlaceholder = xml.includes('{tipo_acao') || xml.includes('{TIPO_ACAO');
            let status = 'NÃO APLICÁVEL';
            let error = '';

            if (hasValue) {
                status = 'OK';
                console.log('OK');
            } else if (hasPlaceholder && !hasValue) {
                status = 'FALHA';
                console.log('FALHA');
            } else {
                console.log('NÃO APLICÁVEL');
            }

            results.push({ tpl, status, hasValue, hasPlaceholder, error });
        } catch (e) {
            results.push({ tpl, status: 'ERRO', hasValue: false, hasPlaceholder: false, error: e.message });
            console.log('ERRO');
        }
    }

    const okCount = results.filter(r => r.status === 'OK').length;
    const failCount = results.filter(r => r.status === 'FALHA').length;
    const naCount = results.filter(r => r.status === 'NÃO APLICÁVEL').length;
    const errCount = results.filter(r => r.status === 'ERRO').length;
    const csvPath = path.join(__dirname, '../verify_templates_report.csv');
    const csvLines = [
        'template,status,hasValue,hasPlaceholder,error',
        ...results.map(r => `${JSON.stringify(r.tpl)},${JSON.stringify(r.status)},${r.hasValue},${r.hasPlaceholder},${JSON.stringify(r.error)}`)
    ];
    fs.writeFileSync(csvPath, csvLines.join('\n'));

    console.log('\nResumo:');
    console.log('  OK           :', okCount);
    console.log('  Falha        :', failCount);
    console.log('  Não aplicável:', naCount);
    console.log('  Erro         :', errCount);
    console.log(`\nCSV gerado em: ${csvPath}`);

    if (failCount > 0 || errCount > 0) {
        process.exit(1);
    }
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(2);
});
