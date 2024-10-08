const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware for activity tracking

const manageSupplier = async (req, res) => {
  const { id, supplier, contactperson, officeaddress, nationality, state, contactpersonphone, bank1, accountnumber1, bank2, accountnumber2, status } = req.body;

  const requiredFields = ['supplier', 'contactperson', 'officeaddress', 'nationality', 'state'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  if (missingFields.length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: `Compulsory fields are missing: ${missingFields.join(', ')}`,
      statuscode: StatusCodes.BAD_REQUEST,
      data: null,
      errors: missingFields
    });
  }

  if (id) {
    // Update
    if (status) {
      // Update only status
      const query = `UPDATE divine."Supplier" SET status = $1 WHERE id = $2`;
      const params = [status, id];
      try {
        await pg.query(query, params);
        await activityMiddleware(req, req.user.id, `Supplier status updated successfully for id ${id}`, 'SUPPLIER'); // Tracker middleware
        return res.status(StatusCodes.OK).json({
          status: true,
          message: "Supplier status updated successfully",
          statuscode: StatusCodes.OK,
          data: null,
          errors: []
        });
      } catch (error) {
        console.error(error);
        await activityMiddleware(req, req.user.id, 'An unexpected error occurred updating supplier status', 'SUPPLIER'); // Tracker middleware
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: false,
          message: "Internal Server Error",
          statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
          data: null,
          errors: []
        });
      }
    } else {
      // Update everything
      const query = `UPDATE divine."Supplier" SET supplier = $1, contactperson = $2, officeaddress = $3, nationality = $4, state = $5, contactpersonphone = $6, bank1 = $7, accountnumber1 = $8, bank2 = $9, accountnumber2 = $10 WHERE id = $11`;
      const params = [supplier, contactperson, officeaddress, nationality, state, contactpersonphone, bank1, accountnumber1, bank2, accountnumber2, id];
      try {
        await pg.query(query, params);
        await activityMiddleware(req, req.user.id, `Supplier updated successfully`, 'SUPPLIER'); // Tracker middleware
        return res.status(StatusCodes.OK).json({
          status: true,
          message: "Supplier updated successfully",
          statuscode: StatusCodes.OK,
          data: null,
          errors: []
        });
      } catch (error) {
        console.error(error);
        await activityMiddleware(req, req.user.id, `An unexpected error occurred updating supplier with id ${id}`, 'SUPPLIER'); // Tracker middleware
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: false,
          message: "Internal Server Error",
          statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
          data: null,
          errors: []
        });
      }
    }
  } else {
    // Create
    const query = `SELECT * FROM divine."Supplier" WHERE supplier = $1`;
    const params = [supplier];
    try {
      const { rows: existingSupplier } = await pg.query(query, params);
      if (existingSupplier.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: false,
          message: "Supplier already exists",
          statuscode: StatusCodes.BAD_REQUEST,
          data: null,
          errors: []
        });
      } else {
        const query = `INSERT INTO divine."Supplier" (supplier, contactperson, officeaddress, nationality, state, contactpersonphone, bank1, accountnumber1, bank2, accountnumber2, status, dateadded, createdby) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
        const params = [supplier, contactperson, officeaddress, nationality, state, contactpersonphone, bank1, accountnumber1, bank2, accountnumber2, "ACTIVE", new Date(), req.user.id];
        try {
          await pg.query(query, params);
          await activityMiddleware(req, req.user.id, 'Supplier created successfully', 'SUPPLIER'); // Tracker middleware
          return res.status(StatusCodes.CREATED).json({
            status: true,
            message: "Supplier created successfully",
            statuscode: StatusCodes.CREATED,
            data: null,
            errors: []
          });
        } catch (error) {
          console.error(error);
          await activityMiddleware(req, req.user.id, 'An unexpected error occurred creating supplier', 'SUPPLIER'); // Tracker middleware
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
          });
        }
      }
    } catch (error) {
      console.error(error);
      await activityMiddleware(req, req.user.id, 'An unexpected error occurred checking supplier existence', 'SUPPLIER'); // Tracker middleware
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "Internal Server Error",
        statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
        data: null,
        errors: []
      });
    }
  }
};

module.exports = { manageSupplier };


