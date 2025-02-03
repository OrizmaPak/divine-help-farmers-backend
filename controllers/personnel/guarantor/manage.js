const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const saveOrUpdateGuarantor = async (req, res) => {
    if (req.files) await uploadToGoogleDrive(req, res);
    const user = req.user;
    let { id, userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown, imageone, imagetwo } = req.body;

    try {
        await pg.query('BEGIN');

        const { rows: userRows } = await pg.query(
            `SELECT id FROM divine."User" WHERE id = $1`,
            [userid]
        );

        if (userRows.length === 0) {
            await pg.query('ROLLBACK');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User ID does not exist",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Invalid User ID"]
            });
        }

        if (id) {
            // Update existing guarantor
            await pg.query(
                `UPDATE divine."guarantor" SET 
                    userid = COALESCE($1, userid), 
                    guarantorname = COALESCE($2, guarantorname), 
                    guarantorofficeaddress = COALESCE($3, guarantorofficeaddress), 
                    guarantorresidentialaddress = COALESCE($4, guarantorresidentialaddress), 
                    guarantoroccupation = COALESCE($5, guarantoroccupation), 
                    guarantorphone = COALESCE($6, guarantorphone), 
                    yearsknown = COALESCE($7, yearsknown), 
                    imageone = COALESCE($8, imageone), 
                    imagetwo = COALESCE($9, imagetwo), 
                    dateadded = NOW(), 
                    createdby = COALESCE($10, createdby), 
                    status = 'ACTIVE' 
                WHERE id = $11`,
                [userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown, imageone, imagetwo, user.id, id]
            );
        } else {
            // Insert new guarantor
            const { rows } = await pg.query(
                `INSERT INTO divine."guarantor" (userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown, imageone, imagetwo, dateadded, createdby, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, 'ACTIVE') RETURNING id`,
                [userid, guarantorname, guarantorofficeaddress, guarantorresidentialaddress, guarantoroccupation, guarantorphone, yearsknown, imageone, imagetwo, user.id]
            );
            // id = rows[0].id;
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