const request = require('request');
const pg = require('../db/pg');


const sendSmsBulk = (number, message) => {
    return new Promise(async (resolve, reject) => {
        if (!number || !message) {
            console.error("Number, message are required");
            return resolve(false);
        }

        const data = {
            "to": number,
            "from": "DHF INC",
            "sms": `${message}`,
            "type": "plain",
            "api_key": process.env.TERMII_API_KEY,
            "channel": "generic",
        };

        const options = {
            'method': 'POST',
            'url': 'https://v3.api.termii.com/api/sms/send/bulk',
            'headers': {
                'Content-Type': ['application/json', 'application/json']
            },
            body: JSON.stringify(data)
        };

        request(options, async function (error, response) {
            if (error) {
                console.error(error);
                return resolve(false);
            }
            console.log(response.body);

            // Store SMS data in the database
            const smsData = {
                text: `INSERT INTO divine."smscharges" (phone, status, createdby) VALUES ($1, $2, $3)`,
                values: [number, "SENT", 0]
            };
            await pg.query(smsData);

            return resolve(true);
        });
    });
};

const sendSms = (number, message) => {
    return new Promise(async (resolve, reject) => {
        if (!number || !message) {
            console.error("Number, message are required");
            return resolve(false);
        }

        // Check if the number is internationally formatted (starts with '+')
        // If not, format it as +234XXXXXXXXXX (assuming Nigerian numbers)
        let formattedNumber = number;
        if (typeof formattedNumber === "string") {
            formattedNumber = formattedNumber.trim();
            if (!formattedNumber.startsWith("+") && formattedNumber.startsWith("0")) {
                // Remove leading zero if present
                if (formattedNumber.startsWith("0")) {
                    formattedNumber = formattedNumber.substring(1);
                }
                // Prepend +234
                formattedNumber = "+234" + formattedNumber;
            }
        }
        number = formattedNumber;

        const data = {
            "to": number,
            "from": "DHF INC",
            "sms": `${message}`,
            "type": "plain",
            "api_key": process.env.TERMII_API_KEY,
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

        request(options, async function (error, response) {
            if (error) {
                console.error(error);
                return resolve(false);
            }
            console.log(response.body);

            // Store SMS data in the database
            const smsData = {
                text: `INSERT INTO divine."smscharges" (phone, status, createdby) VALUES ($1, $2, $3)`,
                values: [number, "SENT", 0]
            };
            await pg.query(smsData);

            return resolve(true);
        });
    });
};

const sendSmsDnd = (number, message) => {
    return new Promise(async (resolve, reject) => {
        if (!number || !message) {
            console.error("Number, message are required");
            return resolve(false);
        }

        const data = {
            "to": number,
            "from": "N-Alert",
            "sms": `${message}`,
            "type": "plain",
            "api_key": process.env.TERMII_API_KEY,
            "channel": "dnd",
        };

        const options = {
            'method': 'POST',
            'url': 'https://v3.api.termii.com/api/sms/send',
            'headers': { 
                'Content-Type': ['application/json', 'application/json']
            },
            body: JSON.stringify(data)
        };

        request(options, async function (error, response) {
            if (error) {
                console.error(error);
                return resolve(false);
            }
            console.log(response.body);

            // Store SMS data in the database
            const smsData = {
                text: `INSERT INTO divine."smscharges" (phone, status, createdby) VALUES ($1, $2, $3)`,
                values: [number, "SENT", 0]
            };
            await pg.query(smsData);

            return resolve(true);
        });
    });
};

const formatPhoneNumber = (number, country='nigeria') => {
    // Define a basic mapping of country codes
    const countryCodes = {
        // African countries
        'nigeria': '+234',
        'south africa': '+27',
        'egypt': '+20',
        'algeria': '+213',
        'morocco': '+212',
        'kenya': '+254',
        'ethiopia': '+251',
        'ghana': '+233',
        'tanzania': '+255',
        'uganda': '+256',
        'ivory coast': '+225',
        'cameroon': '+237',
        'senegal': '+221',
        'sudan': '+249',
        'angola': '+244',
        'zambia': '+260',
        'zimbabwe': '+263',
        'mali': '+223',
        'burkina faso': '+226',
        'madagascar': '+261',
        'malawi': '+265',
        'niger': '+227',
        'rwanda': '+250',
        'sierra leone': '+232',
        'togo': '+228',
        'benin': '+229',
        'burundi': '+257',
        'liberia': '+231',
        'south sudan': '+211',
        'gabon': '+241',
        'guinea': '+224',
        'mozambique': '+258',
        'namibia': '+264',
        'equatorial guinea': '+240',
        'lesotho': '+266',
        'botswana': '+267',
        'eswatini': '+268',
        'chad': '+235',
        'mauritania': '+222',
        'libya': '+218',
        'somalia': '+252',
        'central african republic': '+236',
        'republic of the congo': '+242',
        'djibouti': '+253',
        'eritrea': '+291',
        'gambia': '+220',
        'guinea-bissau': '+245',
        'comoros': '+269',
        'sao tome and principe': '+239',
        'seychelles': '+248',
        'cape verde': '+238',

        // International countries
        'united states': '+1',
        'united kingdom': '+44',
        'canada': '+1',
        'australia': '+61',
        'india': '+91',
        'china': '+86',
        'japan': '+81',
        'germany': '+49',
        'france': '+33',
        'italy': '+39',
        'spain': '+34',
        'brazil': '+55',
        'mexico': '+52',
        'russia': '+7',
        'south korea': '+82',
        'turkey': '+90',
        'saudi arabia': '+966',
        'argentina': '+54',
        'netherlands': '+31',
        'switzerland': '+41',
        'sweden': '+46',
        'belgium': '+32',
        'austria': '+43',
        'poland': '+48',
        'norway': '+47',
        'denmark': '+45',
        'finland': '+358',
        'ireland': '+353',
        'portugal': '+351',
        'greece': '+30',
        'hungary': '+36',
        'czech republic': '+420',
        'romania': '+40',
        'new zealand': '+64',
        'singapore': '+65',
        'malaysia': '+60',
        'thailand': '+66',
        'philippines': '+63',
        'vietnam': '+84',
        'indonesia': '+62',
        'pakistan': '+92',
        'bangladesh': '+880',
        'iran': '+98',
        'iraq': '+964',
        'israel': '+972',
        'united arab emirates': '+971',
        'qatar': '+974',
        'kuwait': '+965',
        'oman': '+968',
        'bahrain': '+973',
    };

    // Check if the number is already in international format
    if (number.startsWith('+')) {
        return number;
    }

    // Get the country code
    const countryCode = countryCodes[country.toLowerCase()];

    if (!countryCode) {
        throw new Error('Unsupported country code');
    }

    // Remove leading zeros from the number
    const localNumber = number.replace(/^0+/, '');

    // Return the formatted number
    return `${countryCode}${localNumber}`;
};


module.exports = { sendSms, sendSmsDnd, sendSmsBulk, formatPhoneNumber };


// DIVINE HELP FARMERS
// Acct: ******4053
// Amt: NGN36.00 DR
// Desc: SHORT DESCRIPTION
// Avail Bal: NGN39.95
// Date: 2025-03-21 6:03:27 PM
// Powered by DIVINE HELP FARMERS