const request = require('request');

const sendSms = (number, message, channel) => {
    return new Promise((resolve, reject) => {
        if (!number || !message || !channel) {
            console.error("Number, message, and channel are required");
            return resolve(false);
        }

        const data = {
            "to": number,
            "from": "N-Alert",
            "sms": `DIVINE HELP FARMERS
Acct: ******4053
Amt: NGN36.00 DR
Desc: SHORT DESCRIPTION
Avail Bal: NGN39.95
Date: 2025-03-21 6:03:27 PM
Powered by DIVINE HELP FARMERS`,
            "type": "plain",
            "api_key": "TLikrtAMedfSSXnubzuDycculAoIkhLKurDrsjcySjHGFqCwbPaxhefrUnPtjr",
            "channel": "generic",
        };

        const options = {
            'method': 'POST',
            'url': 'https://v3.api.termii.com/api/sms/send',
            'headers': {
                'Content-Type': ['application/json', 'application/json']
            },
            body: JSON.stringify(data)
        };

        request(options, function (error, response) {
            if (error) {
                console.error(error);
                return resolve(false);
            }
            console.log(response.body);
            return resolve(true);
        });
    });
};

module.exports = { sendSms };


 