const { StatusCodes } = require('http-status-codes');
const { saveFailedTransaction, savePendingTransaction, saveTransaction, activityMiddleware, calculateCharge, generateNewReference } = require('../../helper');


async function handleDebitTransaction(client, req, res, accountnumber, debit, transactionReference, description, ttype, transactionStatus, savingsProduct, whichaccount){
    
    
                // 9. Debit and Balance Check
                // Query to calculate the current balance by subtracting the sum of debits from the sum of credits for the given account number
                const balanceQuery = `SELECT SUM(credit) - SUM(debit) AS balance FROM divine."transaction" WHERE accountnumber = $1 AND status = 'ACTIVE'`;
                const balanceResult = await client.query(balanceQuery, [accountnumber]);
                const currentBalance = balanceResult.rows[0]?.balance || 0; // Get the current balance or default to 0 if no result

                // Check if the transaction description is not 'CHARGE'
                if (transactiondesc != 'CHARGE') {
                    // Check if the debit amount exceeds the withdrawal limit
                    if (savingsProduct.withdrawallimit > 0 && debit > savingsProduct.withdrawallimit) {
                        tranactionStatus = 'FAILED'; // Set transaction status to 'FAILED'
                        reasonForRejection = 'Withdrawal limit exceeded'; // Set reason for rejection
                        await saveFailedTransaction(client, req, reasonForRejection, transactionReference, whichaccount); // Save the failed transaction
                        await client.query('COMMIT'); // Commit the transaction
                        await activityMiddleware(req, req.user.id, 'Transaction failed due to withdrawal limit exceeded', 'TRANSACTION'); // Log activity
                        return res.status(StatusCodes.BAD_REQUEST).json({
                            status: false,
                            message: 'Transaction failed due to withdrawal limit exceeded.',
                            statuscode: StatusCodes.BAD_REQUEST,
                            data: null,
                            errors: ['Withdrawal limit exceeded.'],
                        }); // Return a response
                    } 
                    // Check if there is a withdrawal charge applicable
                    if (savingsProduct.withdrawalcharge > 0) {
                        const chargeAmount = calculateCharge(savingsProduct, debit); // Calculate the charge amount
                        const transactionParams = {
                            accountnumber: accountnumber,
                            debit: chargeAmount,
                            description: 'Withdrawal Charge',
                            reference: generateNewReference(transactionReference),
                            status: 'PENDING',
                            whichaccount: whichaccount
                        };
                        await saveTransaction(client, transactionParams, req); // Call the saveTransaction function
                        await activityMiddleware(req, req.user.id, 'Pending withdrawal charge transaction saved', 'TRANSACTION'); // Log activity
                    }
                    // Check if there is a minimum account balance requirement
                    if (savingsProduct.minimumaccountbalance > 0) {
                        // Check if the current balance after the debit would be less than the minimum account balance
                        if (currentBalance - debit < savingsProduct.minimumaccountbalance) {
                            transactionStatus = savingsProduct.allowoverdrawn ? 'PENDING' : 'FAILED'; // Set transaction status based on whether overdrawn is allowed
                            reasonForPending = 'Insufficient funds or minimum balance exceeded'; // Set reason for pending status
                            await savePendingTransaction(client, accountnumber, credit, debit, transactionReference, description, ttype, reasonForPending, 'PENDING DEBIT', whichaccount); // Save the pending transaction
                            await activityMiddleware(req, req.user.id, 'Pending debit transaction saved due to insufficient funds or minimum balance exceeded', 'TRANSACTION'); // Log activity
                        }
                    }
                }


                // Debit transaction logic
                const transactionParams = {
                    accountnumber: accountnumber,
                    debit: debit,
                    reference: transactionReference,
                    description: description,
                    ttype: ttype,
                    status: transactionStatus,
                    valuedate: new Date(), // Set the value date to now when transaction becomes active
                    whichaccount: whichaccount
                };
                await saveTransaction(client, transactionParams, req);
                await activityMiddleware(req, req.user.id, 'Debit transaction saved successfully', 'TRANSACTION'); // Log activity
                // const debitTransaction = debitTransactionResult.rows[0];
    
                // // Handle notifications and tax for debit transaction
                // if (debitTransaction.status === 'ACTIVE') {
                //     const taxAmount = calculateTax(debitTransaction);
                //     await client.query(
                //         `UPDATE divine."transaction" SET tax = $1 WHERE reference = $2`,
                //         [taxAmount, transactionReference]
                //     );
                //     await sendNotification(account.user, debitTransaction); // Assume this function exists
                // }
            
};

module.exports = {
    handleDebitTransaction
};
