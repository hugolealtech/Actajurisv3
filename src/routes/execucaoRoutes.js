const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/execucaoController');
const { asyncWrap } = require('../middlewares/errorHandler');
router.get('/clientes/:id/cumprimento',  asyncWrap(ctrl.form));
router.post('/clientes/:id/cumprimento', asyncWrap(ctrl.salvar));
module.exports = router;
