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
    const maskedPart = '*'.repeat(maskLength);
    const visiblePart = valueStr.slice(-4);

    return maskedPart + visiblePart;
}
 

module.exports = {
    sanitizeRequest,
    sanitizeValue,
    maskValue
};

