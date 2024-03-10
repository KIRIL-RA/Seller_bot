const {tgBot} = require('./classes/Telegram_');
const { PlatformDatabase } = require('./classes/Database');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const https =require('https');
const app = express();
const key = fs.readFileSync('./key.pem');
const cert = fs.readFileSync('./cert.pem');

// Setup using modules
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

app.use(`/succesfullypayed`, require('./routes/payment'));

const server = https.createServer({key: key, cert: cert }, app);
server.listen(443, function () {
    tgBot.Init();

    const host = server.address().address;
    const port = server.address().port;
});