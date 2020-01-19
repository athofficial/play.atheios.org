const express = require('express');
const router = express.Router();
const Database=require('../database');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const {athGetAddress, athGetBalance, athdoWithdraw} = require('../ath');
const { check, validationResult } = require('express-validator');
const logger = require("../logger");

const TX_FINISHED=1;
const TX_ONGOING=2;


// Login Form
router.get('/funds', function(req, res){
    if (req.user) {

        pool.queryathaddr(req.user.id, async (error, rows, fields) => {

            await athGetBalance(rows[0].athaddr, function (error, amount) {
                var vsql = "SELECT *, DATE_FORMAT(startdate, \"%d/%m/%Y %H:%i:%s\") AS startdate FROM currencytransfer WHERE userid=" + req.user.id + " ORDER BY startdate DESC LIMIT 10";
                pool.query(vsql, function (error, rows1, fields) {
                    logger.info("rows1: %s", rows1.length);
                    if (error) {
                        if (debugon)
                            console.log('>>> Error: ' + error);
                        req.flash('danger', 'An error occured: ' + error);
                        res.redirect('/');
                    } else {
                        res.render("funds", {
                            title: 'Play | Fund management',
                            version: version,
                            amount: amount,
                            user: req.user,
                            log: rows1,
                            local: ATHaddress
                        });
                    }
                });
            });
        });
    } else {
        req.flash('success', 'You are logged out');
        res.redirect('/login');

    }

});

// Transfer from B to A account
router.post('/funds/withdraw', [
    check('transferamount').isNumeric(),
    check('depositaddr').notEmpty()
], function(req, res){
    if (!validation(req)) {
        res.redirect('/funds');
    } else {
        if (req.user) {
            // Lets firs check if the user is already doing a transaction on the blockchain
            pool.queryuser(req.user.id, function (error, rows) {
                if (error) {
                    req.flash('danger', 'Please logout and in again');
                    res.redirect('/login');
                } else {
                    if (pool.mysqlSecElapsed(rows[0].blockchaintransact) < 60) {
                        // We have a problem, too fast transaction
                        req.flash('danger', 'Wait! Currently You already process with the bloxxchain, wait for 60 sec.');
                        res.redirect('/funds');

                    } else {
                        const amount = req.body.transferamount;
                        const depositaddr = req.body.depositaddr;
                        pool.queryathaddr(req.user.id, async (error, rows, fields) => {
                            athdoWithdraw(rows[0].athaddr, depositaddr, amount, async (errors, tx) => {
                                var vsql = "INSERT INTO currencytransfer (userid, amount,fromaddr, toaddr, startdate, enddate, status, tx) VALUES ('" + req.user.id + "','" + amount + "', '" + req.user.athaddr + "', '" + depositaddr + "','" + pool.mysqlNow() + "','" + pool.mysqlNow() + "'," + TX_FINISHED + ",'"+ tx+"')";
                                logger.info("SQL: %s",vsql);
                                pool.query(vsql, function (error, rows, fields) {
                                    if (error) {
                                        logger.error('>>> Error: %s' + error);
                                        req.flash('danger', 'An error occured: ' + error);
                                        res.redirect('/funds');
                                    } else {
                                        req.flash('success', 'Funds are withdrawn. It might take a minute to let the blockchain to settle it.');
                                        res.redirect('/funds');
                                    }
                                });
                            });
                        });
                    }
                }
            });
        } else {
            req.flash('success', 'User logged out');
            res.redirect('/login');
        }
    }
});

//Transfer from transfer to hot account
router.post('/funds/movetogaming',[
    check('athamount').isNumeric(),
    check('transferamount').isNumeric(),
    check('hotamount').isNumeric()],
    function(req, res) {
    if (!validation(req)) {
        res.redirect('/funds');
    } else {
        if (req.user) {


            // Lets firs check if the user is already doing a transaction on the blockchain
            pool.queryuser(req.user.id, function (error, rows) {
                if (error) {
                    req.flash('danger', 'Please logout and in again');
                    res.redirect('/login');
                } else {
                    if (pool.mysqlSecElapsed(rows[0].blockchaintransact) < 60) {
                        // We have a problem, too fast transaction
                        req.flash('danger', 'Wait! Currently You already process with the bloxxchain, wait for 60 sec.');
                        res.redirect('/funds');
                    } else {
                        const athamount = req.body.athamount;
                        const hotamount = req.body.hotamount;
                        var transferamount = req.body.transferamount;


                        errstr = "";
                        if (transferamount > athamount - 0.00242002)
                            errstr = "Max transfer amount is " + (athamount - 0.00242002) + " ATH";
                        if (transferamount < 0)
                            errstr = "Transfer amount needs to be positive."
                        if (errstr != "") {
                            req.flash('danger', errstr);
                            res.redirect('/funds');

                        } else {
                            pool.queryathaddr(req.user.id, async (error, rows, fields) => {
                                athdoWithdraw(rows[0].athaddr, ATHaddress, transferamount, async (error, tx) => {
                                    if (error) {
                                        req.flash('danger', 'An error occured: ' + error);
                                        res.redirect('/');

                                    } else {
                                        var vsql = "UPDATE user SET athamount=athamount+" + transferamount.toString() + ", blockchaintransact='" + pool.mysqlNow() + "' WHERE id=" + req.user.id;
                                        pool.query(vsql, function (error, rows1, fields) {
                                            if (error) {
                                                if (debugon)
                                                    console.log('>>> Error: ' + error);
                                                req.flash('danger', 'An error occured: ' + error);
                                                res.redirect('/');
                                            } else {
                                                var vsql = "INSERT INTO currencytransfer (userid, amount,fromaddr, toaddr, startdate, enddate, status, tx) VALUES ('" + req.user.id + "','" + transferamount + "', '" + req.user.athaddr + "', '" + ATHaddress + "','" + pool.mysqlNow() + "','" + pool.mysqlNow() + "'," + TX_FINISHED + ",'" + tx + "')";
                                                logger.info("SQL: %s", vsql);
                                                pool.query(vsql, function (error, rows, fields) {
                                                    if (error) {
                                                        logger.error('>>> Error: %s' + error);
                                                        req.flash('danger', 'An error occured: ' + error);
                                                        res.redirect('/');
                                                    } else {
                                                        req.flash('success', 'Funds are withdrawn. It might take a minute to let the blockchain to settle it.');
                                                        res.redirect('/funds');
                                                    }
                                                });
                                            }
                                        });

                                    }
                                });
                            });

                        }
                    }
                }

            });
        } else {
            req.flash('success', 'User logged out');
            res.redirect('/login');
        }
    }
});

// Transfer C to B account
router.post('/funds/movetotransfer', [
    check('athamount').isNumeric(),
    check('transferamount').isNumeric(),
    check('hotamount').isNumeric()],
    function(req, res){
    if (!validation(req)) {
        res.redirect('/funds');
    } else {

        if (req.user) {
            // Lets firs check if the user is already doing a transaction on the blockchain
            pool.queryuser(req.user.id, function (error, rows) {
                if (error) {
                    req.flash('success', 'Please logout and in again');
                    res.redirect('/login');
                } else {
                    if (pool.mysqlSecElapsed(rows[0].blockchaintransact) < 60) {
                        // We have a problem, too fast transaction
                        req.flash('danger', 'Wait! Currently You already process with the bloxxchain, wait for 60 sec.');
                        res.redirect('/funds');

                    } else {

                        const athamount = req.body.athamount;
                        const hotamount = req.body.hotamount;
                        var transferamount = req.body.transferamount;
                        const depositaddr = req.body.depositaddr;

                        errstr = "";
                        if (transferamount > hotamount - 0.00242002)
                            errstr = "Max transfer amount is " + (hotamount - 0.00242002) + " ATH";
                        if (transferamount < 0)
                            errstr = "Transfer amount needs to be positive."
                        if (errstr != "") {
                            req.flash('danger', errstr);
                            res.redirect('/funds');

                        } else {
                            transferamount = Number(transferamount) + 0.00242002;
                            pool.queryathaddr(req.user.id, async (error, rows, fields) => {
                                if (debugon) {
                                    logger.info('>>> DEBUG (fn=movetoathblockchain) transferamount=%d', transferamount);
                                }

                                await athdoWithdraw(ATHaddress, rows[0].athaddr, transferamount, async (error, tx) => {
                                    if (error) {
                                        req.flash('danger', 'An error occured: ' + error);
                                        res.redirect('/');

                                    } else {
                                        var vsql = "UPDATE user SET athamount=athamount-'" + transferamount.toString() + "' WHERE id=" + req.user.id;
                                        pool.query(vsql, function (error, rows1, fields) {
                                            var vsql = "INSERT INTO currencytransfer (userid, amount,fromaddr, toaddr, startdate, enddate, status, tx) VALUES ('" + req.user.id + "','" + transferamount + "', '" + ATHaddress + "', '" + req.user.athaddr + "','" + pool.mysqlNow() + "','" + pool.mysqlNow() + "'," + TX_FINISHED + ",'" + tx + "')";
                                            logger.info("SQL: %s", vsql);
                                            pool.query(vsql, function (error, rows, fields) {
                                                if (error) {
                                                    logger.error('>>> Error: %s' + error);
                                                    req.flash('danger', 'An error occured: ' + error);
                                                    res.redirect('/');
                                                } else {
                                                    req.flash('success', 'Funds are withdrawn. It might take a minute to let the blockchain to settle it.');
                                                    res.redirect('/funds');
                                                }
                                            });
                                        });
                                    }

                                });
                            });
                        }
                    }
                }
            });
        } else {
            req.flash('success', 'User logged out');
            res.redirect('/login');

        }
    }
});

function validation(req) {
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
}

module.exports = router;