    const { google } = require('googleapis');
    const { StatusCodes } = require('http-status-codes');

    const saveDataToGoogleSheet = async (req, res) => {
        const codecheck = [
            {
                "code": "CANADA",
                "name": "Wisdom Dev"
            },
            {
                "code": "LONDON",
                "name": "Oreva Dev"
            }
        ];

        try {
            const data = req.body;

            const auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const authClient = await auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });

            const spreadsheetId = '1UGZ9x-2_xii2M18L0-3mbIxHJ6nI6oORdjiS07FKB2k'; // Replace with your actual Spreadsheet ID
            const range = 'Data Collection'; // Adjust the sheet name and range as needed

            // Fetch existing data to check for the phone number
            const getResult = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            const rows = getResult.data.values;
            let phoneNumberExists = false;
            let rowIndexToUpdate = -1;
            let existingRow = [];

            if (rows) {
                for (let i = 0; i < rows.length; i++) {
                    if (rows[i][0] === data.phonenumber) {
                        phoneNumberExists = true;
                        rowIndexToUpdate = i;
                        existingRow = rows[i];
                        break;
                    }
                }
            }

            const currentDate = new Date().toISOString();
            const userCode = codecheck.find(item => item.code === data.code);
        //    return console.log(userCode, data.code, codecheck);
            if (!userCode) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: true,
                    message: 'Invalid code provided. User cannot proceed.',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: [{ field: 'code', message: 'Code not found in the system.' }]
                });
            }
            const userName = userCode.name;

            const values = [
                [
                    data.phonenumber,
                    data.firstname,
                    data.lastname,
                    data.othernames,
                    data.email,
                    data.branch,
                    data.date_joined,
                    data.batch_no,
                    data.unit,
                    phoneNumberExists ? existingRow[9] : userName, // Created By
                    phoneNumberExists ? userName : '', // Updated By
                    phoneNumberExists ? existingRow[11] : currentDate, // Date Added
                    phoneNumberExists ? currentDate : '', // Date Updated
                ],
            ];

            if (phoneNumberExists) {
                // Update the existing row
                const updateRange = `Data Collection!A${rowIndexToUpdate + 1}:M${rowIndexToUpdate + 1}`;
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: updateRange,
                    valueInputOption: 'RAW',
                    resource: { values },
                });
                console.log(`Row ${rowIndexToUpdate + 1} updated.`);
                return res.status(StatusCodes.OK).json({
                    error: false,
                    message: 'Data updated in Google Sheets successfully.',
                    statuscode: StatusCodes.OK,
                    data: null,
                    errors: []
                });
            } else {
                // Append new data
                const appendResult = await sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range,
                    valueInputOption: 'RAW',
                    resource: { values },
                });
                console.log(`${appendResult.data.updates.updatedCells} cells appended.`);
                return res.status(StatusCodes.OK).json({
                    error: false,
                    message: 'Data appended to Google Sheets successfully.',
                    statuscode: StatusCodes.OK,
                    data: null,
                    errors: []
                });
            }
        } catch (error) {
            console.error('Error processing data in Google Sheets:', error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: true,
                message: 'Failed to process data in Google Sheets.',
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: [{ message: error.message }]
            });
        }
    };


    
const getDataByPhoneNumber = async (req, res) => {
    try {
        const { phonenumber } = req.query;

        // Validate the presence of the phone number in the query
        if (!phonenumber) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: true,
                message: 'Phone number is required.',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: [{ field: 'phonenumber', message: 'Phone number is required.' }]
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

        // Log the header row for verification
        const headerRow = rows[0];
        console.log(`Header Row: ${headerRow}`);

        // Find the row matching the phone number, assuming phone number is in column A (index 0)
        const dataRow = rows.slice(1).find(row => {
            // Handle cases where the row might be shorter than expected
            if (!row[0]) return false;
            // Compare trimmed phone numbers for consistency
            return row[0].trim() === phonenumber.trim();
        });

        // Log whether the phone number was found
        if (dataRow) {
            console.log(`Data Row Found: ${dataRow}`);
        } else {
            console.log(`Phone number ${phonenumber} not found.`);
        }

        // If the phone number is not found, return a 404 response
        if (!dataRow) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: true,
                message: 'Phone number not found in the sheet.',
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        // Map the dataRow to the desired structure using fixed indices
        const data = {
            phonenumber: dataRow[0] || null,
            firstname: dataRow[1] || null,
            lastname: dataRow[2] || null,
            othernames: dataRow[3] || null,
            email: dataRow[4] || null,
            branch: dataRow[5] || null,
            date_joined: dataRow[6] ? new Date(dataRow[6]).toISOString() : null,
            batch_no: dataRow[7] || null,
            unit: dataRow[8] || null
        };

        // Log the mapped data for verification
        console.log(`Mapped Data: ${JSON.stringify(data)}`);

        // Return the mapped data as a successful response
        return res.status(StatusCodes.OK).json({
            error: false,
            message: 'Data retrieved successfully.',
            statuscode: StatusCodes.OK,
            data,
            errors: []
        });

    } catch (error) {
        // Log the error details for debugging
        console.error('Error retrieving data from Google Sheets:', error);

        // Return a 500 response indicating an internal server error
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: 'Failed to retrieve data from Google Sheets.',
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [{ message: error.message }]
        });
    }
};


    module.exports = { saveDataToGoogleSheet, getDataByPhoneNumber };
