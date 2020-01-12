// Setting up the logger for the project
// -> console & file
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const filename = path.join(__dirname+'/log/', 'created-logfile.log');

//
// Remove the file, ignoring any errors
//
try { fs.unlinkSync(filename); }
catch (ex) { }

const logger = module.exports = winston.createLogger({
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp({
            format: 'YY-MM-DD HH:mm:ss'
        }),
        //
        // The simple format outputs
        // `${level}: ${message} ${[Object with everything else]}`
        //
        // winston.format.simple()
        //
        // Alternatively you could use this custom printf format if you
        // want to control where the timestamp comes in your final message.
        // Try replacing `format.simple()` above with this:
        //
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),

    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.splat(),
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
            )
        }),
        new winston.transports.File({ filename }
        )
    ]
});

logger.warn("Logger module initialized.");



module.exports = logger;
