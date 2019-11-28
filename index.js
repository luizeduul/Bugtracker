const express = require('express');

const app = express();

const path = require('path');

const bodyParser = require('body-parser');

const { promisify } = require('util');

const sgMail = require('@sendgrid/mail');

require('dotenv').config();

//doc configs 
const GoogleSpreadsheet = require('google-spreadsheet')
const docId = process.env.DOC_ID;
const worksheetIndex = 0;
const credentials = require('./bugtracker.json');
const sendGridKey = process.env.SG_KEY;

app.set('view engine', 'ejs')
app.set('views', path.resolve(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extend: true }));

app.get('/', (request, response) => {
    response.render('home')
})


app.post('/', async (request, response) => {
    try {
        const doc = new GoogleSpreadsheet(docId);

        await promisify(doc.useServiceAccountAuth)(credentials);

        const info = await promisify(doc.getInfo)();

        const worksheet = info.worksheets[worksheetIndex];

        console.log(worksheet);
        await promisify(worksheet.addRow)({
            name: request.body.name,
            email: request.body.email,
            issueType: request.body.issueType,
            source: request.query.source || 'direct',
            howToReproduce: request.body.howToReproduce,
            expectedOutput: request.body.expectedOutput,
            receivedOutput: request.body.receivedOutput,
            userAgent: request.body.userAgent,
            userDate: request.body.userDate,
        });

        //se for critico
        if (request.body.issueType === 'CRITICAL') {
            sgMail.setApiKey(sendGridKey);
            const msg = {
                to: process.env.SG_EMAIL_TO,
                from: process.env.SG_EMAIL_FROM,
                subject: 'Bug critico',
                text: `O usuario ${request.body.name} reportou um problema critico`,
                html: `O usuario ${request.body.name} reportou um problema critico`,
            };
            await sgMail.send(msg);
        }
        response.render('sucesso');
    } catch (err) {
        response.send('Erro ao enviar o formulário!!');
        console.log(err);
    }
});

app.listen(3000, (err) => {
    if (err) {
        console.log('Aconteceu um erro');
    } else {
        console.log('Bug tracker rodando na porta 3000')
    }
});
