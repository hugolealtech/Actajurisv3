const isDev = process.env.NODE_ENV !== 'production';
function asyncWrap(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function errorHandler(err, req, res, next) {
    const status    = err.status || err.statusCode || 500;
    const timestamp = new Date().toISOString();
    console.error(`\n❌ ERRO ${status} · ${req.method} ${req.originalUrl} · ${err.message}`);
    if (isDev) console.error(err.stack);
    if (req.originalUrl.startsWith('/api')) {
        return res.status(status).json({ ok: false, erro: err.message });
    }
    return res.status(status).render('error', {
        titulo:   `Erro ${status}`,
        mensagem: isDev ? err.message : 'Ocorreu um erro inesperado.',
    });
}
module.exports = { errorHandler, asyncWrap };
