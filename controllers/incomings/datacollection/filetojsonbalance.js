const { StatusCodes } = require('http-status-codes');
const { google } = require('googleapis');
require('dotenv').config();

/**
 * POST /update-balances
 * Body: { phonenumber, sharecapital, thriftsavings, specialsavings }
 */
async function updateBalances(req, res) {
  try {
    /* ───────── 1. Validate input ───────── */
    const { phonenumber, sharecapital, thriftsavings, specialsavings } = req.body;

    if (
      !phonenumber ||
      sharecapital === undefined ||
      thriftsavings === undefined ||
      specialsavings === undefined
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Phone number, share capital, thrift savings, and special savings are required.',
        statuscode: StatusCodes.BAD_REQUEST,
        data: null,
        errors: [
          { field: 'phonenumber', message: 'Phone number is required.' },
          { field: 'sharecapital', message: 'Share capital is required.' },
          { field: 'thriftsavings', message: 'Thrift savings is required.' },
          { field: 'specialsavings', message: 'Special savings is required.' }
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

module.exports = { updateBalances };