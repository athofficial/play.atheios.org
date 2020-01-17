// Setting up the logger for the project
// -> console & file
const winston = require('winston');
const path = require('path');
const filename = path.join(process.cwd()+'/Logs/', 'created-logfile.log');



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



module.exports = logger;
