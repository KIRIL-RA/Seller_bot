const { Telegraf, Router } = require('telegraf');
const Messages = require('./settings/Messages.json');
const Stages = require('./settings/Stages.json');
const { message } = require('telegraf/filters');
const Settings = require('./settings/AllSettings.json');
const Email = require("./Email");
const { PlatformDatabase } = require('./Database');
const { MakeLink } = require("./YouKassa");
const User = require('./User');
const fs = require('fs');

function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

const getInvoice = (id) => {
    const invoice = {
        chat_id: id, // Unique identifier of the target chat or username of the target channel
        provider_token: Settings.PAY_TOKEN, // token issued via bot @SberbankPaymentBot
        start_parameter: 'get_access', // Unique parameter for deep links. If you leave this field blank, forwarded copies of the forwarded message will have a Pay button that allows multiple users to pay directly from the forwarded message using the same account. If not empty, redirected copies of the sent message will have a URL button with a deep link to the bot (instead of a payment button) with a value used as an initial parameter.
        title: Settings.ITEM_NAME, // Product name, 1-32 characters
        description: Settings.ITEM_DESCRIPTION, // Product description, 1-255 characters
        currency: 'RUB', // ISO 4217 Three-Letter Currency Code
        prices: [{ label: Settings.ITEM_NAME, amount: Settings.ITEM_COST * 100 }], // Price breakdown, serialized list of components in JSON format 100 kopecks * 100 = 100 rubles
        payload: { // The payload of the invoice, as determined by the bot, 1-128 bytes. This will not be visible to the user, use it for your internal processes.
            unique_id: `${id}_${Number(new Date())}`,
            provider_token: Settings.PAY_TOKEN
        }
    }

    return invoice
}

class TelegramBot {
    constructor(apiToken) {
        this.bot = new Telegraf(apiToken);
        this.database = PlatformDatabase;
        this.isInitialized = false;
    }

    /**
     * Start telegram bot
     */
    async Init() {
        const bot = this.bot;

        // Initialize components
        await PlatformDatabase.Connect();

        const SendSelectCity = (ctx, from) => this.SendSelectCity(ctx, from);
        this.bot.start(async function (ctx) {

            // Trying registry new user
            try {
                try {
                    const user = new User(ctx.message.from.id, PlatformDatabase);
                    await user.CreateNew(ctx.message.chat.id, ctx.message.from.username);
                }
                catch (e) {
                    const user = new User(ctx.message.from.id, PlatformDatabase);
                    await user.Login();
                }

                await bot.telegram.sendMessage(ctx.message.chat.id, fs.readFileSync(Messages.INIT, { encoding: 'utf8', flag: 'r' }));
                SendSelectCity(ctx, ctx.message.from.id);
            }
            catch (e) {
                console.log(e);
                await bot.telegram.sendMessage(ctx.message.chat.id, "Error");
                SendSelectCity(ctx, ctx.message.from.id);
            }
        });

        // Processing raw text
        bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));
        bot.on(message('text'), (ctx) => { this.HandleRawText(ctx) });

        bot.launch();
        this.isInitialized = true;
    }

    async SendSelectCity(ctx, userId) {
        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.WRITING_CITY);

        await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.SELECT_CITY, { encoding: 'utf8', flag: 'r' }));
    }

    async SendPayed(ctx, userId) {
        await PlatformDatabase.Connect();
            const user = new User(userId, PlatformDatabase);
            await user.Login();

            await user.SetPayed();

            //await Email.SendOnlyTextMail("TestBot", Settings.TO_MAIL, `ОПЛАТА <p>Город: ${user.city}</p> <p>Email: ${user.contact}</p>`);

            await this.SendSuccesfullyPayed(ctx, userId);
    }

    async SendSelectContact(ctx, userId) {

        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.WRITING_CONTACT);

        await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.SELECT_CONTACT, { encoding: 'utf8', flag: 'r' }));
    }

    async SendInvoice(ctx, userId){
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.AWAITING_PAYMENT);
        const paymentData = await MakeLink();
        user.SetPaymentId(paymentData.id);

        let iKeyboard = [];
        iKeyboard.push([{ text: `Оплатить 25руб.`, url:  paymentData.link}] );

        // Keyboard options
        let messageOptions = {
            parse_mode: 'html',
            reply_markup: {
                inline_keyboard: iKeyboard
            }
        };

        await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.AWAITING_PAYMENT, { encoding: 'utf8', flag: 'r' }), messageOptions);
    }

    async SendSuccesfullyPayed(ctx, userId) {

        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.PAYMENT_COMPLETED);

        await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.SUCCESFULLY_PAYED, { encoding: 'utf8', flag: 'r' }));
    }

    async HandleRawText(ctx) {
        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(ctx.message.from.id, PlatformDatabase);
        await user.Login();

        const text = ctx.message.text;

        switch (user?.stages[user?.stages.length - 1]) {
            case Stages.WRITING_CITY:
                await user.SetCity(text)
                this.SendSelectContact(ctx, ctx.message.from.id);
                break;
            case Stages.WRITING_CONTACT:
                if(!validateEmail(text)){
                    await this.bot.telegram.sendMessage(ctx.message.from.id, fs.readFileSync(Messages.INCORRECT_EMAIL, { encoding: 'utf8', flag: 'r' }));
                    this.SendSelectContact(ctx, ctx.message.from.id);
                    return;
                }

                await user.SetContact(text);
                this.SendInvoice(ctx, ctx.message.from.id);
                break;
            case Stages.AWAITING_PAYMENT:
                await this.bot.telegram.sendMessage(ctx.message.from.id, fs.readFileSync(Messages.AWAITING_PAYMENT, { encoding: 'utf8', flag: 'r' }));
                break;
            case Stages.PAYMENT_COMPLETED:
                await this.bot.telegram.sendMessage(ctx.message.from.id, fs.readFileSync(Messages.SUCCESFULLY_PAYED, { encoding: 'utf8', flag: 'r' }));
                break;
            default:
                await this.bot.telegram.sendMessage(ctx.message.chat.id, "Команда не найдена");
                await this.SendMain(ctx, ctx.message.chat.id);
                break;
        }
    }
}

const tgBot = new TelegramBot("7080661601:AAHlV39wQbwZZ5rUOa6XbJG0K1R01TgBAGs");

module.exports = {TelegramBot, tgBot};