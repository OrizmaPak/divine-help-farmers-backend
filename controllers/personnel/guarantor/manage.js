const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const saveOrUpdateGuarantor = async (req, res) => {
    const user = req.user;
    const { id, userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown } = req.body;

    try {
        await pg.query('BEGIN');

        if (id) {
            // Update existing guarantor
            await pg.query(
                `UPDATE divine."guarantor" SET userid = $1, guarantorname = $2, guarantorofficeaddress = $3, guarantorresidentialaddress = $4, guarantoroccupation = $5, guarantorphone = $6, yearsknown = $7, dateadded = NOW(), createdby = $8, status = 'ACTIVE' WHERE id = $9`,
                [userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown, user.id, id]
            );
        } else {
            // Insert new guarantor
            const { rows } = await pg.query(
                `INSERT INTO divine."guarantor" (userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown, dateadded, createdby, status) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, 'ACTIVE') RETURNING id`,
                [userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown, user.id]
            );
            id = rows[0].id;
        }

        await pg.query('COMMIT');

        await activityMiddleware(req, user.id, 'Guarantor saved or updated successfully', 'GUARANTOR');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: id ? "Guarantor updated successfully" : "Guarantor saved successfully",
            statuscode: StatusCodes.OK,
            data: { id },
            errors: []
        });
    } catch (error) {
        await pg.query('ROLLBACK');
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred saving or updating guarantor', 'GUARANTOR');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { saveOrUpdateGuarantor };