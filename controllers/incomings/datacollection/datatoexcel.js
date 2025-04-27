    const { google } = require('googleapis');
    const { StatusCodes } = require('http-status-codes');
    
    const codecheck = [
                { "code": "CANADA", "name": "Wisdom Dev" },
                { "code": "LONDON", "name": "Oreva Dev" },
                { "code": "NEWYORK", "name": "Yray Tester" },
                { "code": "CHICAGO", "name": "Gabriel Tester" },
                { "code": "USA", "name": "John Esegine" },
                { "code": "PHILADELPHIA", "name": "Moses Staff" },
                { "code": "FRANCISCO", "name": "Samuel Staff" },
                { "code": "NIGERIA", "name": "Tobore Staff" },
                { "code": "HOUSTON", "name": "Engineer Lucky" },
            ];


const saveDataToGoogleSheet = async (req, res) => {
        
        
        try {
            const data = req.body; 
    
            // Validate the presence of the type field
            if (!data.type || (data.type !== 'NEW' && data.type !== 'UPDATE')) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: true,
                    message: 'Invalid type provided. Must be either NEW or UPDATE.',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: [{ field: 'type', message: 'Type must be either NEW or UPDATE.' }]
                });
            }
    
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
    
            // Check for type and phone number existence
            if (data.type === 'NEW' && phoneNumberExists) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: true,
                    message: 'Phone number already exists. Cannot create new entry.',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: [{ field: 'phonenumber', message: 'Phone number already exists.' }]
                });
            }
    
            if (data.type === 'UPDATE' && !phoneNumberExists) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: true,
                    message: 'Phone number does not exist. Cannot update non-existent entry.',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: [{ field: 'phonenumber', message: 'Phone number does not exist.' }]
                });
            }
    
            const userCode = codecheck.find(item => item.code === data.code);
    
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
    
            if (data.type === 'UPDATE') {
                const creatorName = existingRow[9]; // Column for 'Created By'
    
                if (creatorName !== userName) {
                    return res.status(StatusCodes.FORBIDDEN).json({
                        error: true,
                        message: 'You are not authorized to update this record.',
                        statuscode: StatusCodes.FORBIDDEN,
                        data: null,
                        errors: [{
                            field: 'code',
                            message: 'The code does not match the original creator of the record.'
                        }]
                    });
                }
            }
    
            const currentDate = new Date().toISOString();
    
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

const getAllDataFromGoogleSheet = async (req, res) => {
    try {
        // Initialize Google Sheets API client with read-only access
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        // Replace with your actual Spreadsheet ID
        const spreadsheetId = '1UGZ9x-2_xii2M18L0-3mbIxHJ6nI6oORdjiS07FKB2k';
        // Specify the exact range to include all relevant columns (A to M)
        const range = 'Data Collection!A:W';

        // Fetch data from the specified range in the spreadsheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;

        // Log the number of rows fetched for debugging
        console.log(`Total rows fetched: ${rows ? rows.length : 0}`);

        // Check if there are enough rows (at least two header rows and one data row)
        if (!rows || rows.length <= 2) { // Assuming first two rows are headers
            return res.status(StatusCodes.NOT_FOUND).json({
                error: true,
                message: 'No data found in the sheet.',
                statuscode: StatusCodes.NOT_FOUND,
                data: [],
                errors: []
            });
        }

        // Extract the header row
        const headerRow = rows[1]; // Start from the second header row
        console.log(`Header Row: ${headerRow}`);

        // Define the mapping based on fixed indices as per the save function
        // Adjust the indices if the structure changes
        const dataObjects = rows.slice(2).map((row, index) => { // Start from row three
            return {
                phonenumber: row[0] || null,
                firstname: row[1] || null,
                lastname: row[2] || null,
                othernames: row[3] || null,
                email: row[4] || null,
                branch: row[5] || null,
                date_joined: row[6] ? new Date(row[6]).toISOString() : null,
                batch_no: row[7] || null,
                unit: row[8] || null,
                sharesbalance: row[16] !== '' ? row[16] || null : row[13] || null,
                thriftsavings: row[17] !== '' ? row[17] || null : row[14] || null,
                specialsavings: row[18] !== '' ? row[18] || null : row[15] || null,
                // Additional fields if needed can be added here
                // For example:
                // created_by: row[9] || null,
                // updated_by: row[10] || null,
                // date_added: row[11] ? new Date(row[11]).toISOString() : null,
                // date_updated: row[12] ? new Date(row[12]).toISOString() : null,
            };
        }); 

        // Log the number of data objects created
        console.log(`Total data objects created: ${dataObjects.length}`);

        // Optionally, you can log the first few data objects for verification
        console.log(`Sample Data: ${JSON.stringify(dataObjects.slice(0, 3), null, 2)}`);

        // Return the array of data objects as a successful response
        return res.status(StatusCodes.OK).json({
            error: false,
            message: 'All data retrieved successfully.',
            statuscode: StatusCodes.OK,
            data: dataObjects,
            errors: []
        });

    } catch (error) {
        // Log the error details for debugging
        console.error('Error retrieving all data from Google Sheets:', error);

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


async function updateBalances(req, res) {
  
    try {
      /* ───────── 1. Validate input ───────── */
      const { phonenumber, sharecapital, thriftsavings, specialsavings, code } = req.body;
  
      if (!phonenumber || sharecapital === undefined || thriftsavings === undefined || specialsavings === undefined || !code) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: true,
          message: 'Phone number, share capital, thrift savings, special savings, and code are required.',
          statuscode: StatusCodes.BAD_REQUEST,
          data: null,
          errors: [
            { field: 'phonenumber', message: 'Phone number is required.' },
            { field: 'sharecapital', message: 'Share capital is required.' },
            { field: 'thriftsavings', message: 'Thrift savings is required.' },
            { field: 'specialsavings', message: 'Special savings is required.' },
            { field: 'code', message: 'Code is required.' }
          ],
        });
      }
  
      /* ───────── 2. Auth Sheets API ───────── */
      const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const authClient = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: authClient });
  
      /* ───────── 3. Locate row by phone number ───────── */
      const spreadsheetId = '1UGZ9x-2_xii2M18L0-3mbIxHJ6nI6oORdjiS07FKB2k';
      const headerRange = 'Data Collection!A:P'; // Read up to column P to check existing values
  
      const { data: { values: rows = [] } } = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: headerRange,
      });
  
      const rowIndexToUpdate = rows.findIndex(r => r[0] === phonenumber);
  
      if (rowIndexToUpdate === -1) {
        return res.status(StatusCodes.NOT_FOUND).json({
          error: true,
          message: 'Phone number not found in the sheet.',
          statuscode: StatusCodes.NOT_FOUND,
          data: null,
          errors: [{ field: 'phonenumber', message: 'Phone number not found.' }],
        });
      }
  
      /* ───────── 4. Helpers ───────── */
      const isBlank = v => v === '' || v === null || v === undefined;
  
      function nextFree(startIdx, rowArr) {
        let idx = startIdx;
        while (!isBlank(rowArr[idx])) idx += 3; // hop N→Q→T … or O→R→U … or P→S→V … until blank
        return idx;
      }
  
      function colToA1(idx) {
        let s = '', n = idx;
        while (n >= 0) {
          s = String.fromCharCode((n % 26) + 65) + s;
          n = Math.floor(n / 26) - 1;
        }
        return s;
      }
  
      /* ───────── 5. Build batchUpdate payload ───────── */
      const row = rows[rowIndexToUpdate];
      const rowNumber = rowIndexToUpdate + 1; // A1 notation is 1-based
  
      // Base positions for N, O, P
      const bases = [13, 14, 15]; // Indices for columns N, O, P (0-based)
      const payload = [sharecapital, thriftsavings, specialsavings];
      const fields = ['sharecapital', 'thriftsavings', 'specialsavings'];
  
      const data = bases.map((base, k) => {
        let targetIdx = base;
        if (!isBlank(row[base])) {
          targetIdx = nextFree(base, row); // Find the next available column 3 steps away
        }
        const a1Cell = `${colToA1(targetIdx)}${rowNumber}`;
        return { range: `Data Collection!${a1Cell}`, values: [[payload[k]]] };
      });
  
      // Get the name associated with the code
      const codeEntry = codecheck.find(entry => entry.code === code);
      if (!codeEntry) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: true,
          message: 'Code not found in codecheck.',
          statuscode: StatusCodes.BAD_REQUEST,
          data: null,
          errors: [{ field: 'code', message: 'Code not found.' }],
        });
      }
      const name = codeEntry.name;
  
      // Determine the column to update the name based on the target index
      const nameColumn = (data.some(d => d.range.includes('N') || d.range.includes('O') || d.range.includes('P'))) ? 'T' : 'U';
      const nameRange = `Data Collection!${nameColumn}${rowNumber}`;
      data.push({ range: nameRange, values: [[name]] });
  
      // Determine the column to update the date based on the target index
      const dateColumn = (data.some(d => d.range.includes('N') || d.range.includes('O') || d.range.includes('P'))) ? 'V' : 'W';
      const dateRange = `Data Collection!${dateColumn}${rowNumber}`;
      const currentDate = new Date().toISOString();
      data.push({ range: dateRange, values: [[currentDate]] });
  
      /* ───────── 6. Push the update (atomic & fast) ───────── */
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED', // let Sheets treat numbers as numbers
          data,
        },
      });
  
      /* ───────── 7. All good ───────── */
      return res.status(StatusCodes.OK).json({
        error: false,
        message: 'Balances updated successfully.',
        statuscode: StatusCodes.OK,
        data: { phonenumber, sharecapital, thriftsavings, specialsavings },
        errors: [],
      });
    } catch (error) {
      console.error('Processing Error:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: 'Failed to update balances.',
        statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
        data: null,
        errors: [{ message: error.message }],
      });
    }
  }


module.exports = { saveDataToGoogleSheet, getDataByPhoneNumber, getAllDataFromGoogleSheet, updateBalances, getMatchingPhoneNumbers };