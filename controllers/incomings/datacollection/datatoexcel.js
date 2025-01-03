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

    module.exports = { saveDataToGoogleSheet };
