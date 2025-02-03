const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const saveOrUpdateReferee = async (req, res) => {
    const user = req.user;
    const {
        id,
        refereename,
        refereeofficeaddress,
        refereeresidentialaddress,
        refereeoccupation,
        refereephone,
        refereeyearsknown,
        relationship,
        imageone,
        imagetwo
    } = req.body;

    if (!refereename || !refereeofficeaddress || !refereeresidentialaddress || !refereeoccupation || !refereephone || !refereeyearsknown || !relationship) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "All required fields must be provided",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Missing required fields"]
        });
    }

    try {
        let query;
        let message;

        if (id) {
            // Update existing referee
            query = {
                text: `UPDATE divine."referee" SET 
                        refereename = COALESCE($1, refereename),
                        refereeofficeaddress = COALESCE($2, refereeofficeaddress),
                        refereeresidentialaddress = COALESCE($3, refereeresidentialaddress),
                        refereeoccupation = COALESCE($4, refereeoccupation),
                        refereephone = COALESCE($5, refereephone),
                        refereeyearsknown = COALESCE($6, refereeyearsknown),
                        relationship = COALESCE($7, relationship),
                        imageone = COALESCE($8, imageone),
                        imagetwo = COALESCE($9, imagetwo)
                       WHERE id = $10 AND status = 'ACTIVE'`,
                values: [refereename, refereeofficeaddress, refereeresidentialaddress, refereeoccupation, refereephone, refereeyearsknown, relationship, imageone, imagetwo, id]
            };
            message = 'Referee updated successfully';
        } else {
            // Insert new referee
            query = {
                text: `INSERT INTO divine."referee" 
                        (refereename, refereeofficeaddress, refereeresidentialaddress, refereeoccupation, refereephone, refereeyearsknown, relationship, imageone, imagetwo, createdby) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                values: [refereename, refereeofficeaddress, refereeresidentialaddress, refereeoccupation, refereephone, refereeyearsknown, relationship, imageone, imagetwo, user.id]
            };
            message = 'Referee saved successfully';
        }

        await pg.query(query);

        await activityMiddleware(req, user.id, message, 'REFEREE');

        return res.status(StatusCodes.OK).json({
            status: true,
            message,
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred saving/updating referee', 'REFEREE');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { saveOrUpdateReferee };