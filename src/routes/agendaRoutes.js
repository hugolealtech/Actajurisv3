const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/agendaController');
const { asyncWrap } = require('../middlewares/errorHandler');
router.get('/agenda', asyncWrap(ctrl.agenda));
module.exports = router;
