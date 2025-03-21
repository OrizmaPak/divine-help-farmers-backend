const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const saveOrUpdateRotaryProduct = async (req, res) => {
    const user = req.user;
    const { id, product, member, useraccount, registrationcharge, productofficer, currency, description, poolnumber, rotaryschedule, frequency, frequencynumber } = req.body;

    try {
        // Validate input
        if (!product) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Product is required",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Product is required"]
            });
        }

        // Ensure that the poolnumber is either sequence or random
        if (!poolnumber || (poolnumber != 'SEQUENCE' && poolnumber != 'RANDOM')) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Pool number must be either 'sequence' or 'random'",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Pool number must be either 'sequence' or 'random'"]
            });
        }

        // Validate member IDs if provided
        if (member) {
            const memberIds = member.includes('||') ? member.split('||') : [member];
            for (const memberId of memberIds) {
                const trimmedMemberId = memberId.trim();
                if (trimmedMemberId) {
                    const { rows } = await pg.query({
                        text: `SELECT 1 FROM divine."DefineMember" WHERE id = $1`,
                        values: [trimmedMemberId]
                    });
                    if (rows.length === 0) {
                        return res.status(StatusCodes.BAD_REQUEST).json({
                            status: false,
                            message: `Member ID ${trimmedMemberId} does not exist`,
                            statuscode: StatusCodes.BAD_REQUEST,
                            data: null,
                            errors: [`Member ID ${trimmedMemberId} does not exist`]
                        });
                    }
                }
            }
        }

        // Check if productofficer is provided and validate user role
        if (productofficer) {
            const { rows: userRoleRows } = await pg.query({
                text: `SELECT role FROM divine."User" WHERE id = $1`,
                values: [user.id]
            });

            if (userRoleRows.length > 0 && userRoleRows[0].role == 'MEMBER') {
                return res.status(StatusCodes.FORBIDDEN).json({
                    status: false,
                    message: "Members are not allowed to assign a product officer",
                    statuscode: StatusCodes.FORBIDDEN,
                    data: null,
                    errors: ["Members are not allowed to assign a product officer"]
                });
            }
        }

        if (id) {
            // Update existing rotary product
            const updateQuery = {
                text: `UPDATE divine."rotaryProduct" 
                       SET product = $1, member = $2, useraccount = $3, registrationcharge = $4, productofficer = $5, currency = $6, description = $7, poolnumber = $8, rotaryschedule = $9, frequency = $10, frequencynumber = $11, status = 'ACTIVE'
                       WHERE id = $12`,
                values: [product, member, useraccount || 1, registrationcharge, productofficer, currency || 'NGN', description, poolnumber, rotaryschedule || 'PRODUCT', frequency, frequencynumber, id]
            };

            await pg.query(updateQuery);

            await activityMiddleware(req, user.id, 'Rotary product updated successfully', 'ROTARY_PRODUCT');

            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Rotary product updated successfully",
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            }); 
        } else {
            // Insert new rotary product
            const insertQuery = {
                text: `INSERT INTO divine."rotaryProduct" (product, member, useraccount, registrationcharge, createdby, productofficer, currency, description, poolnumber, rotaryschedule, frequency, frequencynumber, dateadded, status) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 'ACTIVE')`,
                values: [product, member, useraccount || 1, registrationcharge, user.id, productofficer, currency || 'NGN', description, poolnumber, rotaryschedule || 'PRODUCT', frequency, frequencynumber==''?0:frequencynumber]
            };

            console.log('insertQuery', insertQuery);

            await pg.query(insertQuery);

            await activityMiddleware(req, user.id, 'Rotary product saved successfully', 'ROTARY_PRODUCT');

            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Rotary product saved successfully",
                statuscode: StatusCodes.OK,  
                data: null,
                errors: []
            });
        }
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred saving or updating rotary product', 'ROTARY_PRODUCT');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { saveOrUpdateRotaryProduct };
