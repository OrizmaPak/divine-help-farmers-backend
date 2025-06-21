const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getRegistrationFee = async (req, res) => {
    const user = req.user;
    console.log('user', req.user)
    let { branch } = req.query;

    try {
        // If branch is not provided, use the branch from the user making the request
        if (!branch) {
            console.log(user)
            branch = user.branch;
        } else {
            const { rows: validBranch } = await pg.query(`SELECT branch FROM divine."Branch" WHERE id = $1`, [branch]);
            if (validBranch.length === 0) {
                branch = user.branch;
            }
        }

        // Fetch the registration fee for the branch
        const { rows: branchData } = await pg.query(`SELECT registrationfee FROM divine."Branch" WHERE id = $1`, [branch]);

        if (branchData.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Branch not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        let registrationFee = branchData[0].registrationfee;

        // If registration fee is 0, fetch from organisation settings
        if (registrationFee === 0) {
            const { rows: orgSettings } = await pg.query(`SELECT new_member_registration_charge FROM divine."Organisationsettings" WHERE id = 1`);
            if (orgSettings.length > 0) {
                registrationFee = orgSettings[0].new_member_registration_charge;
            }
        }

        await activityMiddleware(req, user.id, 'Registration fee fetched successfully', 'BRANCH');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Registration fee fetched successfully",
            statuscode: StatusCodes.OK,
            data: { registrationfee: registrationFee },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching registration fee', 'BRANCH');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getRegistrationFee };
