   const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { getTransactionPeriod } = require('../../utils/datecode');
const { generateSentenceControllerwithoutdate } = require("../ai/ai");

const getAllBranchesAndSendMeetingDates = async (req, res) => {
    try {
        // Fetch all branches from the Branch table
        const branchQuery = {
            text: `SELECT id, branch, meetingfrequency FROM divine."Branch"`
        };
        const { rows: branches } = await pg.query(branchQuery);

        if (branches.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "No branches found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["No branches available"]
            });
        }

        // Prepare the data with next meeting dates and meeting frequency translation
        const branchesWithMeetingDates = await Promise.all(branches.map(async branch => {
            const { id, branch: branchName, meetingfrequency } = branch;
            const frequency = meetingfrequency || "D31T";

            // Get the transaction period end date
            const { endDate } = getTransactionPeriod(frequency);

            // Format the end date as DD/MM/YYYY
            const endDateObj = new Date(endDate);
            const formattedDate = `${String(endDateObj.getDate()).padStart(2, '0')}/${String(endDateObj.getMonth() + 1).padStart(2, '0')}/${endDateObj.getFullYear()}`;

            // Translate meeting frequency
            const meetingFrequencyTranslation = await generateSentenceControllerwithoutdate(frequency);

            return {
                id,
                branchName,
                nextMeetingDate: formattedDate,
                meetingFrequencyTranslation,
                frequency
            };
        }));

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Branches and meeting dates fetched successfully",
            statuscode: StatusCodes.OK,
            data: branchesWithMeetingDates,
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

module.exports = { getAllBranchesAndSendMeetingDates };
