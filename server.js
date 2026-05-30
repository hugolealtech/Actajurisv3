const express        = require('express');
const bodyParser     = require('body-parser');
const methodOverride = require('method-override');
const path           = require('path');
const moment         = require('moment');

const connectDB        = require('./src/config/db');
const { errorHandler } = require('./src/middlewares/errorHandler');
const clienteRoutes    = require('./src/routes/clienteRoutes');
const execucaoRoutes   = require('./src/routes/execucaoRoutes');
const agendaRoutes     = require('./src/routes/agendaRoutes');
const apiRoutes        = require('./src/routes/apiRoutes');

connectDB();

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.locals.moment = moment;
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/', clienteRoutes);
app.use('/', execucaoRoutes);
app.use('/', agendaRoutes);
app.use('/api', apiRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`\n🏛️  ActaJuris v3.0 · http://localhost:${PORT}`);
    console.log(`   MongoDB : ${process.env.MONGO_URI || 'mongodb://localhost:27017/actajuris'}`);
    console.log(`   API REST: http://localhost:${PORT}/api\n`);
});
