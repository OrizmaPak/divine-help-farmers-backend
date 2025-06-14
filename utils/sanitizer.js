const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const domPurify = DOMPurify(window);

async function sanitizeRequest(request) {
    const sanitizedParams = {};
    const sanitizedBody = {};

    // Sanitize request parameters
    const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
    for (const [key, value] of searchParams) {
        sanitizedParams[key] = sanitizeValue(value);
    }

    // Sanitize request body
    const body = request.body;
    for (const key in body) {
        sanitizedBody[key] = sanitizeValue(body[key]);
    }

    return { params: sanitizedParams, body: sanitizedBody };
}

function sanitizeValue(value) {
    // Using DOMPurify library for HTML sanitization
    const sanitizedValue = domPurify.sanitize(value);
    return sanitizedValue;
}

function maskValue(value) {
    // Convert the value to a string to ensure we can manipulate it
    const valueStr = String(value);

    // Check if the value is less than or equal to 4 characters, return as is
    if (valueStr.length <= 4) {
        return valueStr;
    }

    // Calculate the number of characters to mask, with a maximum of 6
    const maskLength = Math.min(valueStr.length - 4, 6);
    // const maskedPart = 'XX'.repeat(Math.ceil(maskLength / 2)).slice(0, maskLength);
    const maskedPart = 'XX..';
    const visiblePart = valueStr.slice(-2);

    return maskedPart + visiblePart;
}

function formatNumber(number, zero = "1", dec=2) {
    // If the number is 0 and zero is 0, return an empty string
    if (number == 0 && zero == 0) return '';
    if (!number) return number;
    
    // Ensure the number is rounded to two decimal places
    let formattedNumber = parseFloat(number).toFixed(dec);
  
    // Use regex to add commas to the number
    return formattedNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function internationalizePhoneNumber(phoneNumber, country){
    // Convert the country name to lowercase for comparison
    const countryLower = country.toLowerCase();

    // Map of country names to their respective country codes
    const countryCodeMap = {
        'nigeria': '+234',
        'south africa': '+27',
        'kenya': '+254',
        'ghana': '+233',
        'egypt': '+20',
        'morocco': '+212',
        'algeria': '+213',
        'uganda': '+256',
        'sudan': '+249',
        'angola': '+244',
        'ethiopia': '+251',
        'tanzania': '+255',
        'united states': '+1',
        'china': '+86',
        'india': '+91',
        'brazil': '+55',
        'russia': '+7',
        'japan': '+81',
        'germany': '+49',
        'united kingdom': '+44',
        'france': '+33',
        'italy': '+39',
        'canada': '+1'
    };

    const countryCode = countryCodeMap[countryLower];
    if (!countryCode) {
        throw new Error(`Unsupported country: ${country}`);
    }

    // Remove the leading '0' and prepend the country code
    return phoneNumber.replace(/^0/, countryCode);
};

module.exports = {
    sanitizeRequest,
    sanitizeValue,
    maskValue,
    formatNumber,
    internationalizePhoneNumber
};

