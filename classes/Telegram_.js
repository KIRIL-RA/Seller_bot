const { Telegraf, Router } = require('telegraf');
const Messages = require('./settings/Messages.json');
const Stages = require('./settings/Stages.json');
const { message } = require('telegraf/filters');
const Settings = require('./settings/AllSettings.json');
const Email = require("./Email");
const { PlatformDatabase } = require('./Database');
const { MakeLink } = require("./YouKassa");
const {MAIN_MENU_M} = require("./FilledMessages");
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

        bot.action('cancel_payment', (ctx) => { 
            ctx.deleteMessage();
            this.CancelPayment(ctx, ctx.update.callback_query.from.id) 
        });
        bot.action('new_payment', (ctx) => {
            ctx.deleteMessage();
            this.SendEnterCount(ctx, ctx.update.callback_query.from.id); 
        });

        bot.launch();
        this.isInitialized = true;
    }

    async CancelPayment(ctx, userId) {
        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        try {
            await this.bot.telegram.deleteMessage(ctx.chat.id, ctx.update.callback_query.message.message_id);
        }
        catch(e) { console.log(e)}

        if(user.nowBuyingTickets != null){
            await user.SetNowBuyingTicketsCount(null);
            await user.PushPaymentId({id: user.paymentId, status: "canceled"});
            await user.SetPaymentId(null);

            await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.PAYMENT_CANCELED, { encoding: 'utf8', flag: 'r' }));
            await this.SendMain(ctx, ctx.chat.id);
        }
    }

    async PaymentFailed(ctx, userId){
        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.UNKNOWN);
        await user.SetNowBuyingTicketsCount(null);
        await user.PushPaymentId({id: user.paymentId, status: "failed"});
        await user.SetPaymentId(null);

        if(user.paymentMessage != null){
            await this.bot.telegram.deleteMessage(userId, user.paymentMessage);
            await user.SetPaymentMessageId(null);
        }
        await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.PAYMENT_FAILED, { encoding: 'utf8', flag: 'r' }));
        await this.SendMain(ctx, userId);
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

        await Email.SendOnlyTextMail("TestBot", Settings.TO_MAIL, `ОПЛАТА <p>Город: ${user.city}</p> <p>Email: ${user.contact}</p>`);

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

    async SendInvoice(ctx, userId, ticketsCount) {
        const totalAmount = Settings.ITEM_COST * ticketsCount;

        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.AWAITING_PAYMENT);
        const paymentData = await MakeLink(totalAmount);
        user.SetPaymentId(paymentData.id);

        let iKeyboard = [];
        iKeyboard.push([{ text: `Оплатить ${totalAmount} руб.`, url: paymentData.link }]);
        iKeyboard.push([{ text: `Отменить оплату`, callback_data: `cancel_payment` }]);

        // Keyboard options
        let messageOptions = {
            parse_mode: 'html',
            reply_markup: {
                inline_keyboard: iKeyboard
            }
        };

        const m = await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.AWAITING_PAYMENT, { encoding: 'utf8', flag: 'r' }), messageOptions);
        await user.SetPaymentMessageId(m.message_id);
    }

    async SendSuccesfullyPayed(ctx, userId) {

        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        const newTicketsCount = Number(user.allTicketsCount) + Number(user.nowBuyingTickets);

        await user.SetStage(Stages.UNKNOWN);
        await user.SetAllTicketsCount(newTicketsCount);
        await user.PushPaymentId({id: user.paymentId, status: "succesfull"});
        await user.SetNowBuyingTicketsCount(null);
        await user.SetPaymentId(null);

        if(user.paymentMessage != null){
            await this.bot.telegram.deleteMessage(userId, user.paymentMessage);
            await user.SetPaymentMessageId(null);
        }
        await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.SUCCESFULLY_PAYED, { encoding: 'utf8', flag: 'r' }));
        await this.SendMain(ctx, userId);
    }

    async SendEnterCount(ctx, userId) {

        // Loggining to user
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.ENTER_TICKETS_COUNT);

        await this.bot.telegram.sendMessage(userId, fs.readFileSync(Messages.ASK_TICKETS_COUNT, { encoding: 'utf8', flag: 'r' }));
    }

    async SendMain(ctx, userId) {
        await PlatformDatabase.Connect();
        const user = new User(userId, PlatformDatabase);
        await user.Login();

        await user.SetStage(Stages.MAIN_MENU);

        let iKeyboard = [];
        iKeyboard.push([{ text: `Купить билеты`, callback_data: `new_payment` }]);

        // Keyboard options
        let messageOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: iKeyboard
            }
        };

        await this.bot.telegram.sendMessage(userId, MAIN_MENU_M(user.allTicketsCount), messageOptions);
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
                if (!validateEmail(text)) {
                    await this.bot.telegram.sendMessage(ctx.message.from.id, fs.readFileSync(Messages.INCORRECT_EMAIL, { encoding: 'utf8', flag: 'r' }));
                    this.SendSelectContact(ctx, ctx.message.from.id);
                    return;
                }

                await user.SetContact(text);
                this.SendEnterCount(ctx, ctx.message.from.id);
                break;
            case Stages.ENTER_TICKETS_COUNT:
                const ticketsCount = Number(text);

                if (!isNumber(ticketsCount) || ticketsCount < 0) {
                    await this.bot.telegram.sendMessage(ctx.message.from.id, fs.readFileSync(Messages.INCORRECT_COUNT, { encoding: 'utf8', flag: 'r' }));
                    this.SendEnterCount(ctx, ctx.message.from.id);
                    return;
                }

                await user.SetNowBuyingTicketsCount(ticketsCount);
                this.SendInvoice(ctx, ctx.message.from.id, ticketsCount);
                break;
            case Stages.AWAITING_PAYMENT:
                await this.bot.telegram.sendMessage(ctx.message.from.id, fs.readFileSync(Messages.AWAITING_PAYMENT, { encoding: 'utf8', flag: 'r' }));
                break;
            case Stages.PAYMENT_COMPLETED:
                await this.bot.telegram.sendMessage(ctx.message.from.id, fs.readFileSync(Messages.SUCCESFULLY_PAYED, { encoding: 'utf8', flag: 'r' }));
                break;
            case Stages.MAIN_MENU:
                try {
                    await this.bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id - 1);
                }
                catch(e) { console.log(e)}

                await this.SendMain(ctx, ctx.message.chat.id);
                break;
            default:
                await this.bot.telegram.sendMessage(ctx.message.chat.id, "Команда не найдена");
                await this.SendMain(ctx, ctx.message.chat.id);
                break;
        }
    }
}

const tgBot = new TelegramBot("6192355536:AAGl76H3vEWHtJHYGdGJYJjG4tTEJeNWwmw");

module.exports = { TelegramBot, tgBot };