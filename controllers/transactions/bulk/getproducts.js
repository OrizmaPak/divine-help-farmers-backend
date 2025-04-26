const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");

const getProducts = async (req, res) => {
    const { accounttype, membership } = req.query;

    try {
        if (!accounttype || !membership) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Account type and membership are required.",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: [
                    { field: 'accounttype', message: 'Account type is required.' },
                    { field: 'membership', message: 'Membership is required.' }
                ],
            });
        }

        let query;
        if (accounttype.toLowerCase() === 'savings') {
            query = {
                text: `SELECT id, productname FROM divine."savingsproduct" WHERE $1 = ANY(string_to_array(membership, '||'))`,
                values: [membership]
            };
        } else if (accounttype.toLowerCase() === 'loan') {
            query = {
                text: `SELECT id, productname FROM divine."loanproduct" WHERE $1 = ANY(string_to_array(membership, '||'))`,
                values: [membership]
            };
        } else if (accounttype.toLowerCase() === 'property') {
            query = {
                text: `SELECT id, product AS productname FROM divine."propertyproduct" WHERE $1 = ANY(string_to_array(member, '||'))`,
                values: [membership]
            };
        } else if (accounttype.toLowerCase() === 'rotary') {
            query = {
                text: `SELECT id, product AS productname FROM divine."rotaryProduct" WHERE $1 = ANY(string_to_array(member, '||'))`,
                values: [membership]
            };
        } else {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid account type.",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: [{ field: 'accounttype', message: 'Only "savings", "loan", "property", and "rotary" account types are supported.' }]
            });
        }

        const result = await pg.query(query);
        const products = result.rows.map(row => ({
            id: row.id,
            productname: row.productname
        }));

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Products fetched successfully",
            statuscode: StatusCodes.OK,
            data: products,
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

module.exports = { getProducts };
