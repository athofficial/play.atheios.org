const {athGetBalance} = require('../ath');

const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

module.exports = function(passport) {
    // Local Strategy
    passport.use(new LocalStrategy(function (username, password, done) {
        // Match Username

        var sql = "SELECT * FROM user WHERE username = '" + username + "'";

        pool.query(sql, function (error, rows1, fields) {
            if (error) {
                if (debugon)
                    console.log(' >>> DEBUG SQL failed', error);
                guess_spam = false;
                throw error;
            }
            if (rows1.length == 0) {
                return done(null, false, {message: 'No user found'});
            }


            // Match Password
            bcrypt.compare(password, rows1[0].password, function (err, isMatch) {
                if (err) throw err;
                if (isMatch) {
                    // Increase the login value and update login date
                    var date;
                    date = new Date();
                    date = date.getUTCFullYear() + '-' +
                        ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
                        ('00' + date.getUTCDate()).slice(-2) + ' ' +
                        ('00' + date.getUTCHours()).slice(-2) + ':' +
                        ('00' + date.getUTCMinutes()).slice(-2) + ':' +
                        ('00' + date.getUTCSeconds()).slice(-2);

                    sql="UPDATE user SET logincnt = logincnt+1,  lastlogin= '"+ date +"' WHERE username = '" + username + "'";
                    pool.query(sql, function (error, rows, fields) {
                        if (error) {
                            if (debugon)
                                console.log(' >>> DEBUG SQL failed', error);
                            guess_spam = false;
                            return done(null, false, {message: 'You account has an issue. Contact our service line.'});
                        }
                    });
                    return done(null, rows1[0]);
                } else {
                    return done(null, false, {message: 'Wrong password'});
                }
            });
        });
    }));


    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        var sql = "SELECT * FROM user WHERE id = " + id;
        pool.query(sql, function (error, rows) {
            done(error, rows[0]);
        });

    });
}

