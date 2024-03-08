const { PlatformDatabase } = require("./../classes/Database");
const { tgBot } = require("./../classes/Telegram_");
const User = require('./../classes/User');
var express = require('express');
var router = express.Router();

router.post('/', async function (req, res, next) {

    // Getting session info
    const body = req.body;
    const payId = body.id;

    try {
        // Trying connect to database
        await PlatformDatabase.Connect();
        const user = new User(null, PlatformDatabase);
        if(await user.LoginByPayId(payId)){
            tgBot.SendPayed(undefined, user.id);
        }

        res.status(200).json({ status: "ok" });
    }

    // Catching errors
    catch (e) {
        res.status(200).json({ message: e.message });
    }
});


module.exports = router;