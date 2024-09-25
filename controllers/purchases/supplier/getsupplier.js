const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware for activity tracking

const getSupplier = async (req, res) => {
  const { query } = req;
  let queryStr = `SELECT * FROM divine."Supplier"`;
  let params = [];

  if (Object.keys(query).length > 0) {
    queryStr += " WHERE ";
    Object.keys(query).forEach((key, index) => {
      queryStr += `${key} = $${index + 1}`;
      params.push(query[key]);
      if (index < Object.keys(query).length - 1) {
        queryStr += " AND ";
      }
    });
  }

  try {
    const { rows: suppliers } = await pg.query(queryStr, params);
    await activityMiddleware(req, req.user.id, 'Supplier retrieved successfully', 'SUPPLIER'); // Tracker middleware
    return res.status(StatusCodes.OK).json({
      status: true,
      message: "Supplier retrieved successfully",
      statuscode: StatusCodes.OK,
      data: suppliers,
      errors: []
    });
  } catch (error) {
    console.error(error);
    await activityMiddleware(req, req.user.id, 'An unexpected error occurred fetching supplier', 'SUPPLIER'); // Tracker middleware
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error",
      statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
      data: null,
      errors: []
    });
  }
};

module.exports = { getSupplier };

