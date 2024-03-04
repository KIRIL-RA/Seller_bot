const Telegram = require('./classes/Telegram_');
const { PlatformDatabase } = require('./classes/Database');
const nodeCron = require("node-cron");

// Main block
async function Main() {
    const tgBot = new Telegram(/*'6703114328:AAFKsF16e0BzyQ6Q45nvkA7Lds7OqaID33I'*/
        "6192355536:AAGl76H3vEWHtJHYGdGJYJjG4tTEJeNWwmw");
    await tgBot.Init();

    /*// Setting up pay schedule
    nodeCron.schedule('0 0 8 * * *', ()=>{
        PayServers(tgBot.shadowsocks, tgBot, PlatformDatabase);
    });*/
}

Main();

