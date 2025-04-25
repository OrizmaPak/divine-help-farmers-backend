const { google } = require('googleapis');
const { StatusCodes } = require('http-status-codes');

const getMatchingPhoneNumbers = async (req, res) => {
    try {
        const { number } = req.query;

        // Validate the presence of the number in the query
        if (!number) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: true,
                message: 'Number is required.',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: [{ field: 'number', message: 'Number is required.' }]
            });
        }

        // Initialize Google Sheets API client with read-only access
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        // Replace with your actual Spreadsheet ID
        const spreadsheetId = '1UGZ9x-2_xii2M18L0-3mbIxHJ6nI6oORdjiS07FKB2k';
        // Specify the exact range to include all relevant columns (A to M)
        const range = 'Data Collection!A:M';

        // Fetch data from the specified range in the spreadsheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;

        // Log the number of rows fetched for debugging
        console.log(`Total rows fetched: ${rows ? rows.length : 0}`);

        // Check if there are enough rows (at least one header row and one data row)
        if (!rows || rows.length <= 1) { // Assuming first row is header
            return res.status(StatusCodes.NOT_FOUND).json({
                error: true,
                message: 'No data found in the sheet.',
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        // Use regex to find matching phone numbers
        const regex = new RegExp(number, 'i');
        const matchingRows = rows.slice(1).filter(row => regex.test(row[0]));

        // Log the number of matching rows found
        console.log(`Total matching rows found: ${matchingRows.length}`);

        // If no matching phone numbers are found, return a 404 response
        if (matchingRows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: true,
                message: 'No matching phone numbers found.',
                statuscode: StatusCodes.NOT_FOUND,
                data: [],
                errors: []
            });
        }

        // Map the matching rows to the desired structure
        const dataObjects = matchingRows.map(row => ({
            phonenumber: row[0] || null,
            firstname: row[1] || null,
            lastname: row[2] || null,
            othernames: row[3] || null,
            email: row[4] || null,
            branch: row[5] || null,
            date_joined: row[6] ? new Date(row[6]).toISOString() : null,
            batch_no: row[7] || null,
            unit: row[8] || null,
        }));

        // Log the number of data objects created
        console.log(`Total data objects created: ${dataObjects.length}`);

        // Return the array of data objects as a successful response
        return res.status(StatusCodes.OK).json({
            error: false,
            message: 'Matching phone numbers retrieved successfully.',
            statuscode: StatusCodes.OK,
            data: dataObjects,
            errors: []
        });

    } catch (error) {
        // Log the error details for debugging
        console.error('Error retrieving matching phone numbers from Google Sheets:', error);

        // Return a 500 response indicating an internal server error
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: 'Failed to retrieve matching phone numbers from Google Sheets.',
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [{ message: error.message }]
        });
    }
};

module.exports = { getMatchingPhoneNumbers };
