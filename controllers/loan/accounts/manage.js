const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const manageLoanAccount = async (req, res) => {
    const { id, accountnumber, userid, registrationpoint, registrationcharge, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, loanproduct, repaymentfrequency, numberofrepayments, duration, durationcategory, interestmethod, interestrate, defaultpenaltyid, loanamount } = req.body;
    const user = req.user;

    // Basic validation
    const errors = [];

    if (!userid) {
        errors.push({
            field: 'userid',
            message: 'User ID not found'
        });
    } else if (isNaN(parseInt(userid))) {
        errors.push({
            field: 'userid',
            message: 'User ID must be a number'
        });
    }

    if (registrationpoint !== undefined && registrationpoint !== '' && isNaN(parseInt(registrationpoint))) {
        errors.push({
            field: 'registrationpoint',
            message: 'Registration point must be a number'
        });
    }

    if (registrationcharge !== undefined && registrationcharge !== '' && isNaN(parseFloat(registrationcharge))) {
        errors.push({
            field: 'registrationcharge',
            message: 'Registration charge must be a number'
        });
    }

    if (registrationdesc !== undefined && registrationdesc !== '' && typeof registrationdesc !== 'string') {
        errors.push({
            field: 'registrationdesc',
            message: 'Registration description must be a string'
        });
    }

    if (bankname1 !== undefined && bankname1 !== '' && typeof bankname1 !== 'string') {
        errors.push({
            field: 'bankname1',
            message: 'Bank name 1 must be a string'
        });
    }

    if (bankaccountname1 !== undefined && bankaccountname1 !== '' && typeof bankaccountname1 !== 'string') {
        errors.push({
            field: 'bankaccountname1',
            message: 'Bank account name 1 must be a string'
        });
    }

    if (bankaccountnumber1 !== undefined && bankaccountnumber1 !== '' && isNaN(parseInt(bankaccountnumber1))) {
        errors.push({
            field: 'bankaccountnumber1',
            message: 'Bank account number 1 must be a number'
        });
    }

    if (bankname2 !== undefined && bankname2 !== '' && typeof bankname2 !== 'string') {
        errors.push({
            field: 'bankname2',
            message: 'Bank name 2 must be a string'
        });
    }

    if (bankaccountname2 !== undefined && bankaccountname2 !== '' && typeof bankaccountname2 !== 'string') {
        errors.push({
            field: 'bankaccountname2',
            message: 'Bank account name 2 must be a string'
        });
    }

    if (bankaccountnumber2 !== undefined && bankaccountnumber2 !== '' && isNaN(parseInt(bankaccountnumber2))) {
        errors.push({
            field: 'bankaccountnumber2',
            message: 'Bank account number 2 must be a number'
        });
    }

    if (accountofficer !== undefined && accountofficer !== '' && typeof accountofficer !== 'string') {
        errors.push({
            field: 'accountofficer',
            message: 'Account officer must be a string'
        });
    }

    if (!loanproduct) {
        errors.push({
            field: 'loanproduct',
            message: 'Loan product not found'
        });
    } else if (isNaN(parseInt(loanproduct))) {
        errors.push({
            field: 'loanproduct',
            message: 'Loan product must be a number'
        });
    }

    if (repaymentfrequency !== undefined && repaymentfrequency !== '' && typeof repaymentfrequency !== 'string') {
        errors.push({
            field: 'repaymentfrequency',
            message: 'Repayment frequency must be a string'
        });
    }

    if (numberofrepayments !== undefined && numberofrepayments !== '' && isNaN(parseInt(numberofrepayments))) {
        errors.push({
            field: 'numberofrepayments',
            message: 'Number of repayments must be a number'
        });
    }

    if (duration !== undefined && duration !== '' && isNaN(parseInt(duration))) {
        errors.push({
            field: 'duration',
            message: 'Duration must be a number'
        });
    }

    if (durationcategory !== undefined && durationcategory !== '' && typeof durationcategory !== 'string') {
        errors.push({
            field: 'durationcategory',
            message: 'Duration category must be a string'
        });
    }

    if (interestmethod !== undefined && interestmethod !== '' && typeof interestmethod !== 'string') {
        errors.push({
            field: 'interestmethod',
            message: 'Interest method must be a string'
        });
    }

    if (interestrate !== undefined && interestrate !== '' && isNaN(parseFloat(interestrate))) {
        errors.push({
            field: 'interestrate',
            message: 'Interest rate must be a number'
        });
    }

    if (defaultpenaltyid !== undefined && defaultpenaltyid !== '' && isNaN(parseInt(defaultpenaltyid))) {
        errors.push({
            field: 'defaultpenaltyid',
            message: 'Default penalty ID must be a number'
        });
    }

    if (loanamount === undefined || loanamount === '' || isNaN(parseFloat(loanamount))) {
        errors.push({
            field: 'loanamount',
            message: 'Loan amount must be a number'
        });
    }

    if (errors.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Validation Errors",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: errors
        });
    }

    try {
        // Check if the user exists and get the branch from the user table
        const userQuery = {
            text: 'SELECT * FROM divine."User" WHERE id = $1',
            values: [userid]
        };
        const { rows: userRows } = await pg.query(userQuery);
        if (userRows.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'User does not exist',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        const branch = userRows[0].branch;

        // Check if the loan product exists
        const loanProductQuery = {
            text: 'SELECT * FROM divine."loanproduct" WHERE id = $1',
            values: [loanproduct]
        };
        const { rows: loanProductRows } = await pg.query(loanProductQuery);
        if (loanProductRows.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Loan product does not exist',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }
        
        // Check if the branch exists
        const branchQuery = {
            text: 'SELECT * FROM divine."branch" WHERE id = $1',
            values: [branch]
        };
        const { rows: branchRows } = await pg.query(branchQuery);
        if (branchRows.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Branch does not exist',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check if the branch is excluded from the loan product
        const loanProduct = loanProductRows[0];
        if (loanProduct.excludebranch) {
            const excludedBranches = loanProduct.excludebranch.split(',').map(Number);
            if (excludedBranches.includes(branch)) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: 'This branch does not have the permission to open a loan account',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }


        // Check if the account officer exists
        if (accountofficer) {
            const officerQuery = {
                text: 'SELECT * FROM divine."User" WHERE id = $1',
                values: [accountofficer]
            };
            const { rows: officerRows } = await pg.query(officerQuery);
            if (officerRows.length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: 'Account officer does not exist',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }

        // Fetch the organisation settings
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
        const orgSettingsResult = await pg.query(orgSettingsQuery);

        if (orgSettingsResult.rowCount === 0) {
            await activityMiddleware(req, user.id, 'Organisation settings not found', 'LOAN_ACCOUNT');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Organisation settings not found.",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Organisation settings not found."]
            });
        }

        const orgSettings = orgSettingsResult.rows[0];
        const accountNumberPrefix = orgSettings.loan_account_prefix;

        if (!accountNumberPrefix) {
            await activityMiddleware(req, user.id, 'Account number prefix not found in organisation settings', 'LOAN_ACCOUNT');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Loan account prefix not set in organisation settings.",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Loan account prefix not set in organisation settings."]
            });
        }

        const accountRowsQuery = `SELECT accountnumber FROM divine."accountnumbers" WHERE accountnumber::text LIKE $1 ORDER BY accountnumber DESC LIMIT 1`;
        const { rows: accountRows } = await pg.query(accountRowsQuery, [`${accountNumberPrefix}%`]);

        let generatedAccountNumber;
        if (accountRows.length === 0) {
            generatedAccountNumber = `${accountNumberPrefix}${'0'.repeat(10 - accountNumberPrefix.toString().length - 1)}1`;
        } else {
            const highestAccountNumber = accountRows[0].accountnumber;
            const newAccountNumber = parseInt(highestAccountNumber) + 1;
            const newAccountNumberStr = newAccountNumber.toString();

            if (newAccountNumberStr.startsWith(accountNumberPrefix)) {
                generatedAccountNumber = newAccountNumberStr.padStart(10, '0');
            } else {
                await activityMiddleware(req, user.id, `More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`, 'LOAN_ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: `More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                }); 
            }
        }

        if (!accountnumber) {
            // Check if repayment settings is ACCOUNT
            if (loanProduct.repaymentsettings === 'ACCOUNT') {
                // Validate account-specific settings
                if (!repaymentfrequency) {
                    errors.push({
                        field: 'repaymentfrequency',
                        message: 'Repayment frequency not found'
                    });
                } else if (typeof repaymentfrequency !== 'string' || !['D1', 'W1', 'M1'].includes(repaymentfrequency)) {
                    errors.push({
                        field: 'repaymentfrequency',
                        message: 'Repayment frequency must be one of "D1", "W1", or "M1"'
                    });
                }

                if (!numberofrepayments) {
                    errors.push({
                        field: 'numberofrepayments',
                        message: 'Number of repayments not found'
                    });
                } else if (isNaN(parseInt(numberofrepayments, 10)) || parseInt(numberofrepayments, 10) <= 0) {
                    errors.push({
                        field: 'numberofrepayments',
                        message: 'Number of repayments must be a positive number'
                    });
                }

                if (!duration) {
                    errors.push({
                        field: 'duration',
                        message: 'Duration not found'
                    });
                } else if (isNaN(parseInt(duration, 10)) || parseInt(duration, 10) <= 0) {
                    errors.push({
                        field: 'duration',
                        message: 'Duration must be a positive number'
                    });
                }

                if (!durationcategory) {
                    errors.push({
                        field: 'durationcategory',
                        message: 'Duration category not found'
                    });
                } else if (typeof durationcategory !== 'string' || !['DAY', 'WEEK', 'MONTH', 'YEAR'].includes(durationcategory)) {
                    errors.push({
                        field: 'durationcategory',
                        message: 'Duration category must be one of "DAY", "WEEK", "MONTH", or "YEAR"'
                    });
                }

                if (!interestmethod) {
                    errors.push({
                        field: 'interestmethod',
                        message: 'Interest method not found'
                    });
                } else if (typeof interestmethod !== 'string' || !['NO INTEREST', 'FLAT RATE', 'ONE OF INTEREST', 'INTEREST ONLY', 'EQUAL INSTALLMENTS'].includes(interestmethod)) {
                    errors.push({
                        field: 'interestmethod',
                        message: 'Interest method must be one of "NO INTEREST", "FLAT RATE", "ONE OF INTEREST", "INTEREST ONLY", or "EQUAL INSTALLMENTS"'
                    });
                }

                if (!interestrate) {
                    errors.push({
                        field: 'interestrate',
                        message: 'Interest rate not found'
                    });
                } else if (isNaN(parseFloat(interestrate)) || parseFloat(interestrate) <= 0) {
                    errors.push({
                        field: 'interestrate',
                        message: 'Interest rate must be a positive number'
                    });
                }
            } else if (loanProduct.repaymentsettings === 'PRODUCT') {
                // Ensure loan product has values for product-specific settings
                if (!loanProduct.repaymentfrequency) {
                    errors.push({
                        field: 'repaymentfrequency',
                        message: 'Repayment frequency not set in loan product'
                    });
                }

                if (!loanProduct.numberofrepayments) {
                    errors.push({
                        field: 'numberofrepayments',
                        message: 'Number of repayments not set in loan product'
                    });
                }

                if (!loanProduct.duration) {
                    errors.push({
                        field: 'duration',
                        message: 'Duration not set in loan product'
                    });
                }

                if (!loanProduct.durationcategory) {
                    errors.push({
                        field: 'durationcategory',
                        message: 'Duration category not set in loan product'
                    });
                }

                if (!loanProduct.interestmethod) {
                    errors.push({
                        field: 'interestmethod',
                        message: 'Interest method not set in loan product'
                    });
                }

                if (!loanProduct.interestrate) {
                    errors.push({
                        field: 'interestrate',
                        message: 'Interest rate not set in loan product'
                    });
                }
            }

                // Start of Selection
                if (loanProduct.eligibilityproductcategory === 'SAVINGS') {
                    const savingsAccountQuery = {
                        text: `
                            SELECT s.*, 
                                   (SELECT SUM(credit) - SUM(debit) 
                                    FROM divine."transaction" 
                                    WHERE accountnumber = s.accountnumber) AS balance 
                            FROM divine."savings" s 
                            WHERE s.userid = $1 AND s.savingsproductid = $2
                        `,
                        values: [user.id, loanProduct.eligibilityproduct]
                    };
                    const { rows: savingsAccounts } = await pg.query(savingsAccountQuery);

                    if (savingsAccounts.length === 0) {
                        errors.push({
                            field: 'eligibilityproduct',
                            message: 'User does not have an account in the specified savings product'
                        });
                    } else {
                        const { dateadded, accountnumber, balance } = savingsAccounts[0];

                        if (loanProduct.eligibilityaccountage > 0) {
                            const accountAgeInMonths = Math.floor((Date.now() - new Date(dateadded).getTime()) / (1000 * 60 * 60 * 24 * 30));
                            if (accountAgeInMonths < loanProduct.eligibilityaccountage) {
                                errors.push({
                                    field: 'eligibilityaccountage',
                                    message: 'User account age is less than the required eligibility account age'
                                });
                            }
                        }

                        const { eligibilitytype, minimumloan, maximumloan } = loanProduct;

                        if (eligibilitytype === 'AMOUNT') {
                            if (loanAmount < minimumloan || loanAmount > maximumloan) {
                                errors.push({
                                    field: 'loanAmount',
                                    message: 'Loan amount must be within the range of minimum and maximum loan amounts'
                                });
                            }
                        } else if (eligibilitytype === 'PERCENTAGE') {
                            const calculatedMaximumLoan = (balance * maximumloan) / 100;
                            if (loanAmount < minimumloan || loanAmount > calculatedMaximumLoan) {
                                errors.push({
                                    field: 'loanAmount',
                                    message: 'Loan amount must be within the range of minimum loan and calculated maximum loan based on account balance'
                                });
                            }
                        }
                    }
                }

                // Start of Selection
                if (loanProduct.eligibilityproductcategory === 'LOAN') {
                    const loanAccountQuery = {
                        text: 'SELECT * FROM divine."loanaccounts" WHERE userid = $1 AND loanproduct = $2',
                        values: [user.id, loanProduct.eligibilityproduct]
                    };
                    const { rows: loanAccountRows } = await pg.query(loanAccountQuery);
        
                    if (loanAccountRows.length === 0) {
                        errors.push({
                            field: 'eligibilityproduct',
                            message: 'User does not have an account in the specified loan product'
                        });
                    } else {
                        const loanAccount = loanAccountRows[0];
                        let totalClosedAmount = 0;
                        let closedAccountsCount = 0;
        
                        // Fetch totalClosedAmount and closedAccountsCount if needed
                        if (loanProduct.eligibilitytype === 'PERCENTAGE' || loanProduct.eligibilityminimumloan > 0 || loanProduct.eligibilityminimumclosedaccounts > 0) {
                            const aggregateQuery = {
                                text: `
                                    SELECT 
                                        COALESCE(SUM(closeamount), 0) AS totalClosedAmount,
                                        COUNT(*) FILTER (WHERE closeamount > 0) AS closedAccountsCount
                                    FROM divine."loanaccounts"
                                    WHERE userid = $1 AND loanproduct = $2
                                `,
                                values: [user.id, loanProduct.eligibilityproduct]
                            };
                            const { rows } = await pg.query(aggregateQuery);
                            totalClosedAmount = parseFloat(rows[0].totalclosedamount) || 0;
                            closedAccountsCount = parseInt(rows[0].closedaccountscount, 10) || 0;
                        }
        
                        // Validate loan amount based on eligibility type
                        if (loanProduct.eligibilitytype === 'AMOUNT') {
                            if (loanAmount < loanProduct.minimumloan || loanAmount > loanProduct.maximumloan) {
                                errors.push({
                                    field: 'loanAmount',
                                    message: 'Loan amount must be within the range of minimum and maximum loan amounts'
                                });
                            }
                        } else if (loanProduct.eligibilitytype === 'PERCENTAGE') {
                            const calculatedMaximumLoan = (totalClosedAmount * loanProduct.maximumloan) / 100;
                            if (loanAmount < loanProduct.minimumloan || loanAmount > calculatedMaximumLoan) {
                                errors.push({
                                    field: 'loanAmount',
                                    message: 'Loan amount must be within the range of minimum loan and calculated maximum loan based on closed amount'
                                });
                            }
                        }
        
                        // Validate eligibility minimum loan
                        if (loanProduct.eligibilityminimumloan > 0 && totalClosedAmount < loanProduct.eligibilityminimumloan) {
                            errors.push({
                                field: 'eligibilityminimumloan',
                                message: 'User total closed loan amount is less than the required eligibility minimum loan amount'
                            });
                        }
        
                        // Validate eligibility minimum closed accounts
                        if (loanProduct.eligibilityminimumclosedaccounts > 0 && closedAccountsCount < loanProduct.eligibilityminimumclosedaccounts) {
                            errors.push({
                                field: 'eligibilityminimumclosedaccounts',
                                message: 'User closed loan accounts count is less than the required eligibility minimum closed accounts'
                            });
                        }
                    }
                }

            

            if (errors.length > 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Validation Errors",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: errors
                });
            }
        }


        if (accountnumber) {
            // Check if the account number already exists
            const accountNumberExistsQuery = `SELECT * FROM divine."loanaccounts" WHERE accountnumber = $1`;
            const accountNumberExistsResult = await pg.query(accountNumberExistsQuery, [accountnumber]);

            if (accountNumberExistsResult.rowCount === 0) {
                await activityMiddleware(req, user.id, 'Attempt to update a loan account with a non-existent account number', 'LOAN_ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Account number does not exist.",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Account number does not exist."]
                });
            }

            // Check if the branch exists in the branch table if branch is sent
            if (branch) {
                const branchExistsQuery = `SELECT * FROM divine."Branch" WHERE id = $1`;
                const branchExistsResult = await pg.query(branchExistsQuery, [branch]);

                if (branchExistsResult.rowCount === 0) {
                    await activityMiddleware(req, user.id, 'Attempt to update a loan account with a non-existent branch', 'LOAN_ACCOUNT');
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: "Branch does not exist.",
                        statuscode: StatusCodes.BAD_REQUEST,
                        data: null,
                        errors: ["Branch does not exist."]
                    });
                }
            }

            // Update existing loan account
            const updateaccountnumberQuery = {
                text: `UPDATE divine."loanaccounts" SET 
                        accountnumber = COALESCE($1, accountnumber), 
                        userid = COALESCE($2, userid),
                        branch = COALESCE($3, branch), 
                        registrationpoint = COALESCE($4, registrationpoint), 
                        registrationcharge = COALESCE($5, registrationcharge), 
                        registrationdesc = COALESCE($6, registrationdesc), 
                        bankname1 = COALESCE($7, bankname1), 
                        bankaccountname1 = COALESCE($8, bankaccountname1), 
                        bankaccountnumber1 = COALESCE($9, bankaccountnumber1), 
                        bankname2 = COALESCE($10, bankname2), 
                        bankaccountname2 = COALESCE($11, bankaccountname2), 
                        bankaccountnumber2 = COALESCE($12, bankaccountnumber2), 
                        accountofficer = COALESCE($13, accountofficer), 
                        loanproduct = COALESCE($14, loanproduct), 
                        repaymentfrequency = COALESCE($15, repaymentfrequency), 
                        numberofrepayments = COALESCE($16, numberofrepayments), 
                        duration = COALESCE($17, duration), 
                        durationcategory = COALESCE($18, durationcategory), 
                        interestmethod = COALESCE($19, interestmethod), 
                        interestrate = COALESCE($20, interestrate), 
                        defaultpenaltyid = COALESCE($21, defaultpenaltyid),
                        loanamount = COALESCE($22, loanamount),
                        status = COALESCE($23, status),
                        dateadded = COALESCE($24, dateadded),
                        createdby = COALESCE($25, createdby),
                        dateclosed = COALESCE($26, dateclosed)
                       WHERE id = $27 RETURNING *`,
                values: [accountnumber, userid, branch, registrationpoint, registrationcharge, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, loanproduct, repaymentfrequency, numberofrepayments, duration, durationcategory, interestmethod, interestrate, defaultpenaltyid, loanamount, 'ACTIVE', new Date(), user.id, null, id]
            };
            const { rows: updatedaccountnumberRows } = await pg.query(updateaccountnumberQuery);
            accountnumber = updatedaccountnumberRows[0];
        } else {
            // Create new loan account
            const createaccountnumberQuery = {
                text: `INSERT INTO divine."loanaccounts" 
                        (accountnumber, userid, branch, registrationpoint, registrationcharge, registrationdate, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, loanproduct, repaymentfrequency, numberofrepayments, duration, durationcategory, interestmethod, interestrate, defaultpenaltyid, loanamount, status, dateadded, createdby, dateclosed) 
                       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING *`,
                values: [generatedAccountNumber, userid, branch, registrationpoint, registrationcharge, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, loanproduct, repaymentfrequency, numberofrepayments, duration, durationcategory, interestmethod, interestrate, defaultpenaltyid, loanamount, 'ACTIVE', new Date(), user.id, null]
            };
            const { rows: newaccountnumberRows } = await pg.query(createaccountnumberQuery);
            accountnumber = newaccountnumberRows[0];
        }

        await activityMiddleware(req, user.id, id ? 'Loan account updated successfully' : 'Loan account created successfully', 'LOAN_ACCOUNT');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: id ? "Loan account updated successfully" : "Loan account created successfully",
            statuscode: StatusCodes.OK,
            data: accountnumber,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred while managing the loan account', 'LOAN_ACCOUNT');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { manageLoanAccount };
