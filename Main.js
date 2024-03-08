const {tgBot} = require('./classes/Telegram_');
const { PlatformDatabase } = require('./classes/Database');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const app = express();

// Setup using modules
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

app.use(`/succesfullypayed`, require('./routes/payment'));

// Launching server
const server = app.listen(80, function () {
    tgBot.Init();

    const host = server.address().address;
    const port = server.address().port;
  });

