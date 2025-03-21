const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");

const createOrUpdateVideo = async (req, res) => {
    const user = req.user;
    const { location, link, description, dateadded, status = 'ACTIVE' } = req.body;

    try {
        // Check if a video with the same location already exists
        const { rows: existingVideos } = await pg.query(`SELECT * FROM divine."Video" WHERE "location" = $1`, [location]);

        if (existingVideos.length > 0) {
            // If a video with the same location exists, update it
            const updateQuery = { 
                text: `
                    UPDATE divine."Video"
                    SET 
                        link = COALESCE($1, link),
                        description = COALESCE($2, description),
                        dateadded = COALESCE($3, dateadded),
                        status = COALESCE($4, status)
                    WHERE "location" = $5
                    RETURNING *
                `,
                values: [link, description, dateadded, status, location]
            };

            const { rows: updatedRows } = await pg.query(updateQuery);
 
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Video updated successfully",
                statuscode: StatusCodes.OK,
                data: updatedRows[0],
                errors: []
            });
        } else {
            // If no video with the same location exists, insert a new video
            const insertQuery = {
                text: `
                    INSERT INTO divine."Video" ("location", link, description, dateadded, createdby, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                `,
                values: [location, link, description, dateadded, user.id, status]
            };

            const { rows: insertedRows } = await pg.query(insertQuery);

            return res.status(StatusCodes.CREATED).json({
                status: true,
                message: "Video created successfully",
                statuscode: StatusCodes.CREATED,
                data: insertedRows[0],
                errors: []
            });
        }
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

module.exports = { createOrUpdateVideo };
