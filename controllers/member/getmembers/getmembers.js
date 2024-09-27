const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");

const getUsers = async (req, res) => {
    try {
        const { filterBy, filterValue } = req.query;
        let query = {
            text: `SELECT * FROM users`,
            values: []
        };

        if (filterBy && filterValue) {
            query.text += ` WHERE ${filterBy} = $1`;
            query.values.push(filterValue);
        }

        const result = await pg.query(query);
        const users = result.rows;

        res.status(StatusCodes.OK).json({ users });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
};

module.exports = { getUsers };

