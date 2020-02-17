// Establishing connection to the database
var mysql = require('mysql');
var util= require('util');

class Database {
    constructor() {
        this.connection = mysql.createPool({
            connectionLimit: config.connectionLimit,
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            multipleStatements: config.multipleStatements,
            timezone: config.timezone
        });
    }
    mysqlSecElapsed(timestr) {
        if (timestr===null)
            return(1000);
        var date = new Date();
        var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
            date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

        // Split timestamp into [ Y, M, D, h, m, s ]
        const t = timestr.toString().split(/[- :]/);

        // Apply each element to the Date function
        const mysqlDate = Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4], t[5]);
        return((now_utc-mysqlDate)/1000);
    }
    mysqlNow() {
        var date;
        date = new Date();
        date = date.getUTCFullYear() + '-' +
            ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
            ('00' + date.getUTCDate()).slice(-2) + ' ' +
            ('00' + date.getUTCHours()).slice(-2) + ':' +
            ('00' + date.getUTCMinutes()).slice(-2) + ':' +
            ('00' + date.getUTCSeconds()).slice(-2);
        return(date);
    }
    query( sql, arg) {
        this.connection.query(sql, arg, (error,rows) => {
            if (error) {
                if (debugon)
                    console.log('DEBUG >>> ', error);
                cb(error,null);
            } else {
                cb(null, rows);
            }
        });
    }
    queryuser( userId, cb) {
        var sql = "SELECT * FROM user WHERE id=" + userId;
        this.connection.query(sql, async (error,rows,fields) => {
            if (error) {
                if (debugon)
                    console.log('DEBUG >>> '+error);
                cb(error,null);
            } else {
                if (rows.length == 0) {
                    if (debugon)
                        console.log('>>>> DEBUG fn=(queryuser): Could not find user');
                    cb("Coudn't find userid " + userId, null);
                }
                if (rows.length > 1) {
                    if (debugon)
                        console.log('>>>> DEBUG fn=(queryuser): Database corrupt? Two entries');
                    cb("Found too many entries for userid " + userId, null);
                }
                // Return rows
                if (rows.length==1)
                    cb(null, rows);
            }
        });
    }
    queryathaddr( userId, cb) {
        var sql = "SELECT * FROM user WHERE id=" + userId;
        this.connection.query(sql, async (error,rows,fields) => {
            if (error) {
                if (debugon)
                    console.log('DEBUG >>> '+error);
                cb(error,null);
            } else {
                if (rows.length == 0) {
                    if (debugon)
                        console.log('DEBUG >>> Empty result, create new address for this user<<<');
                    cb("Coudn't find userid " + userId, null);
                }
                if (rows.length > 1) {
                    if (debugon)
                        console.log('DEBUG >>> Database corrupt? Two entries<<<');
                    cb("Found too many entries for userid " + userId, null);
                }
                // Check if the ath address is valid
                if (rows[0].athaddr==="") {
                    await athGetAddress(async(error,athaddress) => {
                        var vsql = "UPDATE user SET athaddr='" + athaddress + "' WHERE id=" + userId;
                        await this.connection.query(vsql, async (error, rows1, fields) => {
                            if (error) {
                                if (debugon)
                                    console.log('DEBUG >>> ' + error);
                                cb(error, null);
                            } else {
                                rows[0].athaddr = athaddress;
                                cb(null, rows);
                            }
                        });
                    });
                }
                cb(null, rows);
            }
        });
    }
    logging(userid, str) {
        return new Promise( ( resolve, reject ) => {
            var date;
            date = new Date();
            date = date.getUTCFullYear() + '-' +
                ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
                ('00' + date.getUTCDate()).slice(-2) + ' ' +
                ('00' + date.getUTCHours()).slice(-2) + ':' +
                ('00' + date.getUTCMinutes()).slice(-2) + ':' +
                ('00' + date.getUTCSeconds()).slice(-2);
            if (str.length>255) {
                if (debugon)
                    console.log(" >>> DEBUG (fn=logging) String is to long for logging: ", str);
            } else {
                this.connection.query("INSERT INTO logs (userid, log, date) VALUES (" + userid + ", '" + str + "','" + date + "')", (err, rows) => {
                    if (err)
                        return reject(err);
                    resolve(rows);
                });
            }
        });
    }
    escape(arg) {
        return(this.connection.escape(arg));
    }

}

module.exports = Database;