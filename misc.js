const { validationResult } = require('express-validator');

exports.miscValidation=function(req) {
    var i;

    const errorFormatter = ({location, msg, param, value, nestedErrors}) => {
        // Build your resulting errors however you want! String, object, whatever - it works!
        return `Error: ${msg} for ${param}`;
    };

    var errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
        var errorstr = "";
        for (i = 0; i < errors.array().length; i++) {
            errorstr += errors.array()[i];
            if (i < errors.array().length - 1) {
                errorstr += ", ";
            }

        }
        logger.error("Error in validation: %", errorstr);
        req.flash('danger', errorstr);
        return(false);
    }
    return(true);
};


