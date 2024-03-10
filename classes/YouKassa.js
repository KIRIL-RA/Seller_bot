const axios = require('axios');

async function MakeLink(value) {
    const data = {
        amount: {
            value: value,
            currency: "RUB"
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: "https://t.me/Play_For_Luck_bot"
        },
        description: "Розыгрыш мерина"
    };

    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic MzM4NjEyOmxpdmVfb0ZKd0xiXzBvUVJqRjE5b29DcVZmbXRGU1hTSURTVVlsWlBKdHI0eU1MNA==',
            'Idempotence-Key': String(new Date().getTime())
        }
    };

    const response = await axios.post('https://api.yookassa.ru/v3/payments', data, config);

    return {
        id: response?.data?.id,
        link: response?.data?.confirmation?.confirmation_url
    };
}

module.exports = {MakeLink};