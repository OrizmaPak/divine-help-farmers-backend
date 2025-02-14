   const { StatusCodes } = require("http-status-codes");
   const pg = require("../../db/pg");
   const { activityMiddleware } = require("../../middleware/activity");
   const { divideAndRoundUp } = require("../../utils/pageCalculator");
   const { generateOfllineCode } = require("../../utils/generateid");

   const getofflineready = async (req, res) => {
       try {
           // Fetch pagination parameters
           const searchParams = new URLSearchParams(req.query);
           const page = parseInt(searchParams.get('page') || '1', 10);
           const limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT, 10);
           const offset = (page - 1) * limit;

           // Fetch personal account prefix from OrganisationSettings
           const { rows: [{ personal_account_prefix }] } = await pg.query(`
               SELECT personal_account_prefix 
               FROM divine."Organisationsettings"
               LIMIT 1
           `);

           console.log('personal_account_prefix', personal_account_prefix);

           // Define queries for each account type
           const loanAccountsQuery = {
               text: `
                   SELECT 
                       la.accountnumber::text AS accountnumber, 
                       CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS fullname, 
                       'LOAN' AS accounttype
                   FROM divine."loanaccounts" la
                   JOIN divine."User" u ON la.userid::text = u.id::text
               `,
               values: []
           };

           const propertyAccountsQuery = {
               text: `
                   SELECT 
                       pa.accountnumber::text AS accountnumber, 
                       CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS fullname, 
                       'PROPERTY' AS accounttype
                   FROM divine."propertyaccount" pa
                   JOIN divine."User" u ON pa.userid::text = u.id::text
               `,
               values: []
           };

           const rotaryAccountsQuery = {
               text: `
                   SELECT 
                       ra.accountnumber::text AS accountnumber, 
                       CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS fullname, 
                       'ROTARY' AS accounttype
                   FROM divine."rotaryaccount" ra
                   JOIN divine."User" u ON ra.userid::text = u.id::text
               `,
               values: []
           };

           const savingsAccountsQuery = {
               text: `
                   SELECT 
                       sa.accountnumber::text AS accountnumber, 
                       CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS fullname, 
                       'SAVINGS' AS accounttype
                   FROM divine."savings" sa
                   JOIN divine."User" u ON sa.userid::text = u.id::text
               `,
               values: []
           };

           const personalAccountsQuery = {
               text: `
                   SELECT 
                       CONCAT($1::text, u.phone::text) AS accountnumber, 
                       CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS fullname, 
                       'PERSONAL' AS accounttype
                   FROM divine."User" u
               `,
               values: [personal_account_prefix]
           };

           // Fetch marketers details
           const marketersQuery = {
               text: `
                   SELECT 
                       u.id, u.phone, u.branch, u.registrationpoint
                   FROM divine."User" u
                   WHERE u.role != 'MEMBER' AND u.registrationpoint IS NOT NULL AND u.registrationpoint != 0
               `,
               values: []
           };

           // Execute all queries in parallel
           const [loanResult, propertyResult, rotaryResult, savingsResult, personalResult, marketersResult] = await Promise.all([
               pg.query(loanAccountsQuery),
               pg.query(propertyAccountsQuery),
               pg.query(rotaryAccountsQuery),
               pg.query(savingsAccountsQuery),
               pg.query(personalAccountsQuery),
               pg.query(marketersQuery)
           ]);

           // Combine all accounts into one array
           const allAccounts = [
               ...loanResult.rows,
               ...propertyResult.rows,
               ...rotaryResult.rows,
               ...savingsResult.rows,
               ...personalResult.rows
           ];

           // Generate codes for marketers
           const marketers = marketersResult.rows.map(m => ({
               ...m,
               code: generateOfllineCode(m.id, m.phone, m.branch, m.registrationpoint),
               pin: parseInt(generateOfllineCode(m.id, m.phone, m.branch, m.registrationpoint).replaceAll('-', ''))
           }));

           // Calculate total and pagination
           const total = allAccounts.length;
           const pages = Math.ceil(total / limit);
           const paginatedAccounts = allAccounts.slice(offset, offset + limit);

           // Respond with data and pagination info
           return res.status(StatusCodes.OK).json({
               status: true,
               message: "All accounts and marketers fetched successfully",
               statuscode: StatusCodes.OK,
               data: {
                   accounts: paginatedAccounts,
                   marketers: marketers
               },
               pagination: { 
                   total: Number(total),
                   pages,
                   page,
                   limit
               },
               errors: []
           });
       } catch (error) {
           console.error('Unexpected Error:', error);

           return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
               status: false,
               message: "An unexpected error occurred",
               statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
               data: null,
               errors: [error.message]
           });
       }
   };

   module.exports = { getofflineready };
