 // Start of Selection
const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { generateText } = require("../../ai/ai");

const getMemberPropertyAccounts = async (req, res) => {
  const { member } = req.query;
  const user = req.user || {};

  if (!member) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: "Member ID is required",
      statuscode: StatusCodes.BAD_REQUEST,
      data: null,
      errors: ["Member ID not provided"]
    });
  }

  try {
    // 1) Fetch property accounts for the member with status ACTIVE
    const propertyAccountQuery = `
      SELECT 
        pa.*,
        pp.* 
      FROM divine."propertyaccount" pa
      JOIN divine."propertyproduct" pp 
        ON pa.productid = pp.id
      WHERE pa.membershipid = $1 AND pa.status = 'ACTIVE' AND userid
      ORDER BY pa.dateadded DESC
    `;
    const { rows: accountRows } = await pg.query(propertyAccountQuery, [member]);

    if (accountRows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: `No active property accounts found for member`,
        statuscode: StatusCodes.NOT_FOUND,
        data: null,
        errors: [] 
      });
    }

    const results = [];

    // 2) Process each account individually
    for (const accountRow of accountRows) {
      const currentAccountNumber = accountRow.accountnumber;

      // Fetch user details to get fullname
      const userQuery = {
        text: `SELECT firstname, lastname, othernames, branch FROM divine."User" WHERE id = $1`,
        values: [accountRow.userid]
      };
      const { rows: userRows } = await pg.query(userQuery);
      const userFullname = userRows.length > 0 ? `${userRows[0].firstname} ${userRows[0].lastname} ${userRows[0].othernames}`.trim() : "Unknown User";

      // Fetch branch details to get branchname
      const branchQuery = {
        text: `SELECT branch FROM divine."Branch" WHERE id = $1`,
        values: [userRows[0].branch]
      };
      const { rows: branchRows } = await pg.query(branchQuery);
      const branchName = branchRows.length > 0 ? branchRows[0].branch : "Unknown Branch";

      // Fetch member names
      let memberNames = "No Members";
      if (accountRow.member) {
        const memberIds = accountRow.member.includes('||') ? accountRow.member.split('||') : [accountRow.member];
        const memberNamesArray = [];
        for (const memberId of memberIds) {
          const memberQuery = {
            text: `SELECT member FROM divine."DefineMember" WHERE id = $1`,
            values: [memberId]
          };
          const { rows: memberRows } = await pg.query(memberQuery);
          if (memberRows.length > 0) {
            memberNamesArray.push(memberRows[0].member);
          }
        }
        memberNames = memberNamesArray.join(', ');
      }

      // --- 2a) Get property items
      const itemsQuery = {
        text: `SELECT * FROM divine."propertyitems" WHERE accountnumber = $1`,
        values: [currentAccountNumber]
      };
      const { rows: itemRows } = await pg.query(itemsQuery);

      // Fetch item names from Inventory and add to itemRows
      for (const item of itemRows) {
        const inventoryQuery = {
          text: `SELECT itemname FROM divine."Inventory" WHERE itemid = $1`,
          values: [item.itemid]
        };
        const { rows: inventoryRows } = await pg.query(inventoryQuery);
        item.itemname = inventoryRows.length > 0 ? inventoryRows[0].itemname : "Unknown Item";
      }

      // --- 2b) Get installments, sorted by duedate
      const installmentsQuery = {
        text: `SELECT * 
               FROM divine."propertyinstallments"
               WHERE accountnumber = $1
               ORDER BY duedate ASC`,
        values: [currentAccountNumber]
      };
      const { rows: rawInstallments } = await pg.query(installmentsQuery);

      // Convert them into a mutable array (each row we will augment with new fields)
      const installmentRows = rawInstallments.map((inst) => ({
        ...inst,
        amountpaid: 0,
        amountowed: Number(inst.amount) || 0,
        paymentstatus: "NOT PAID",
        transactionrefs: [] // We'll store references of transactions that pay this installment
      }));

      // --- 2c) Fetch all transactions for this account
      // We'll separate them into credits & debits
      const transactionsQuery = {
        text: `
          SELECT 
            id, 
            credit,
            debit,
            transactionref, 
            dateadded
          FROM divine."transaction"
          WHERE accountnumber = $1
          ORDER BY dateadded ASC
        `,
        values: [currentAccountNumber]
      };
      const { rows: allTransactions } = await pg.query(transactionsQuery);

      // 3) Separate credits and debits.
      //    We'll first apply all debits to the earliest credits to get a net distribution.
      let creditTxs = allTransactions
        .filter((tx) => tx.credit != 0)
        .map((tx) => ({
          ...tx,
          remainingAmount: Number(tx.credit) // how much is still available to pay installments after debits
        }));

      const debitTxs = allTransactions
        .filter((tx) => tx.debit != 0)
        .map((tx) => ({ ...tx, amount: Number(tx.debit) }));

      // 4) Apply debits to earliest credits
      //    We take each debit in chronological order (already sorted) and reduce from the earliest credit(s).
      for (const debit of debitTxs) {
        let debitRemaining = debit.debit;
        // Move through creditTxs until we exhaust this debit or run out of credits
        for (const cred of creditTxs) {
          if (debitRemaining <= 0) break; // done with this debit

          if (cred.remainingAmount > 0) {
            const toReduce = Math.min(cred.remainingAmount, debitRemaining);
            cred.remainingAmount -= toReduce;
            debitRemaining -= toReduce;
          }
        }
      }

      // Now creditTxs array has 'remainingAmount' that reflects net leftover after all debits

      // 5) Allocate leftover credit to installments, earliest installments first
      //    We'll go installment by installment, pulling from creditTxs in ascending date order.
      let creditPointer = 0; // points to the current creditTx we are allocating
      while (creditPointer < creditTxs.length && installmentRows.some((inst) => inst.amountowed > 0)) {
        // If the current creditTx is fully used, move pointer
        if (creditTxs[creditPointer].remainingAmount <= 0) {
          creditPointer++;
          continue;
        }

        const currentCreditTx = creditTxs[creditPointer];

        // Find the next installment that is not fully paid
        const nextUnpaidInstallment = installmentRows.find((inst) => inst.amountowed > 0);
        if (!nextUnpaidInstallment) {
          // If no unpaid installments remain, break out
          break;
        }

        // How much can we allocate to this installment?
        const allocation = Math.min(
          currentCreditTx.remainingAmount,
          nextUnpaidInstallment.amountowed
        );

        // Update installment
        nextUnpaidInstallment.amountpaid += allocation;
        nextUnpaidInstallment.amountowed -= allocation;
        // We'll consider it PARTLY PAID or PAID
        if (nextUnpaidInstallment.amountowed === 0) {
          nextUnpaidInstallment.paymentstatus = "PAID";
        } else if (nextUnpaidInstallment.amountowed < (nextUnpaidInstallment.amount || 0)) {
          nextUnpaidInstallment.paymentstatus = "PARTLY PAID";
        }
        // Add reference info
        nextUnpaidInstallment.transactionrefs.push({
          transactionref: currentCreditTx.transactionref,
          allocated: allocation
        });

        // Update creditTx leftover
        currentCreditTx.remainingAmount -= allocation;
      }

      // 6) Summaries: totalRemitted, totalOwed, leftover -> accountBalance
      const totalRemitted = installmentRows.reduce((sum, inst) => sum + inst.amountpaid, 0);
      const totalOwed = installmentRows.reduce((sum, inst) => sum + inst.amountowed, 0);
      // If there is leftover credit after paying all installments:
      //   sum(creditTxs.remainingAmount)
      const leftoverCredit = creditTxs.reduce((sum, cred) => sum + cred.remainingAmount, 0);
      let accountBalance = leftoverCredit > 0 ? leftoverCredit : 0;

      // 7) Final object
      const finalAccountObj = {
        ...accountRow,
        fullname: userFullname, // Add fullname to the account object
        branchname: branchName, // Add branchname to the account object
        membernames: memberNames, // Add member names to the account object
        accountbalance: accountBalance,
        totalRemitted,
        totalOwed
      };

      results.push({
        account: finalAccountObj,    // propertyaccount + new fields
        product: accountRow,         // product details (since we did SELECT pa.*, pp.*)
        items: itemRows,             // propertyitems with itemname added
        installments: installmentRows
      });
    }

    // 7a) Analyze data using generateText
    const prompt = `very very very Briefly analyze this property account data: ${JSON.stringify(results)}. Highlight the next payment due date and encourage prompt payment to claim the item. thats all. do it like you are addressing the person by greeting. and for date put it in sentence for july 23rd 2025
    `;
    const analyzedData = await generateText(prompt);

    // 8) Log activity
    await activityMiddleware(req, user.id, "Fetched member property account(s) successfully", "PROPERTY_ACCOUNT");

    // 9) Return the combined result
    return res.status(StatusCodes.OK).json({
      status: true,
      message: "Successfully fetched member property account(s)",
      statuscode: StatusCodes.OK,
      data: {
        accounts: results,
        details: analyzedData // Updated to include analyzed data
      },
      errors: []
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    await activityMiddleware(
      req,
      user.id || null,
      "An unexpected error occurred fetching member property account(s)",
      "PROPERTY_ACCOUNT"
    );

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "An unexpected error occurred",
      statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
      data: null,
      errors: [error.message]
    });
  }
};

module.exports = {
  getMemberPropertyAccounts
};
