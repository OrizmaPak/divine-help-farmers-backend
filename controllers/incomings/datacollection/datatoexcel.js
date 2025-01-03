    const { google } = require('googleapis');
    const { StatusCodes } = require('http-status-codes');

    const saveDataToGoogleSheet = async (req, res) => {
      try {
        const data = req.body;

        const auth = new google.auth.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const spreadsheetId = '1UGZ9x-2_xii2M18L0-3mbIxHJ6nI6oORdjiS07FKB2k'; // Replace with your actual Spreadsheet ID
        const range = 'Data Collection'; // Adjust the sheet name and range as needed

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
          ],
        ];

        const resource = { values };

        const result = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource,
        });

        console.log(`${result.data.updates.updatedCells} cells appended.`);
        return res.status(StatusCodes.OK).json({ 
          error: false,
          message: 'Data appended to Google Sheets successfully.',
          statuscode: StatusCodes.OK,
          data: null,
          errors: []
        });
      } catch (error) {
        console.error('Error appending data to Google Sheets:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
          error: true,
          message: 'Failed to append data to Google Sheets.',
          statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
          data: null,
          errors: [{ message: error.message }]
        });
      }
    };

    module.exports = { saveDataToGoogleSheet };
