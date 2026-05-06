const { parseErrors } = require('../lib/validations');

// Returns an Express middleware that validates req.body against a Zod schema.
// On failure: 400 with { success: false, message, errors }.
// On success: replaces req.body with the coerced/parsed data and calls next().
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors:  parseErrors(result.error),
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
