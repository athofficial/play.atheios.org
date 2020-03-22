const express = require('express');
const router = express.Router();
const {athGetBalance, athdoWithdraw} = require('../ath');
const { check, validationResult } = require('express-validator');
const logger = require("../logger");
const {MISC_validation} = require('../misc');
const Mail=require('../mail');


const TX_FINISHED=1;
const TX_ONGOING=2;


// Login Form
router.get('/funds', function(req, res){
    var confmail;
    if (req.user) {

        pool.queryathaddr(req.user.id, async (error, rows, fields) => {

            await athGetBalance(rows[0].athaddr, function (error, amount) {
                if (error || amount == null) {
                    res.render("error", {
                        title: 'Play | Fund management',
                        version: version,
                        message: "Atheios connection not working",
                        error: error
                    });
                    confmail = new Mail();
                    confmail.sendMail('play@atheios.org', "Atheios PLAY error (funds)", error + '\nDetails:\n' + error.stack);
                } else {

                    var vsql = "SELECT *, DATE_FORMAT(startdate, \"%d/%m/%Y %H:%i:%s\") AS startdate FROM currencytransfer WHERE userid=" + req.user.id + " ORDER BY startdate DESC LIMIT 10";
                    logger.info("#server.funds.get.funds: SQL: %s", vsql);
                    pool.query(vsql, function (error, rows1, fields) {
                       if (error) {
                            logger.error("#server.funds.get.funds: Error: %s",error);
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
                }
            });
        });
    } else {
        req.flash('success', 'You are logged out');
        res.redirect('/login');

    }

});

// Transfer from B to A account
router.post('/funds/withdraw', [
    check('transferamount').isNumeric().withMessage("Please check the transfer amount. The input should be numeric."),
    check('depositaddr').notEmpty().withMessage("The depositaddress can't be empty.")
], function(req, res){
    if (!MISC_validation(req)) {
        res.redirect('/funds');
    } else {
        if (req.user) {
            // Lets firs check if the user is already doing a transaction on the blockchain
            pool.queryuser(req.user.id, function (error, rows) {
                if (error) {
                    logger.error("#server.funds.post.funds.withdraw: Error: %s",error);
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
                            if (error) {
                                logger.error("#server.funds.post.funds.withdraw: Error: %s",error);
                                req.flash('danger', 'An error occured: ' + error);
                                res.redirect('/funds');
                            } else {
                                athdoWithdraw(rows[0].athaddr, depositaddr, amount, async (error, tx) => {
                                    if (error) {
                                        logger.error("#server.funds.post.funds.withdraw: Error: %s",error);
                                        req.flash('danger', 'An error occured: ' + error);
                                        res.redirect('/funds');
                                    } else {
                                        var vsql = "INSERT INTO currencytransfer (userid, amount,fromaddr, toaddr, startdate, enddate, status, tx) VALUES ('" + req.user.id + "','" + amount + "', '" + req.user.athaddr + "', '" + depositaddr + "','" + pool.mysqlNow() + "','" + pool.mysqlNow() + "'," + TX_FINISHED + ",'" + tx + "')";
                                        logger.info("#server.funds.post.funds.withdraw: SQL: %s", vsql);
                                        pool.query(vsql, function (error, rows, fields) {
                                            if (error) {
                                                logger.error("#server.funds.post.funds.withdraw: Error: %s", error);
                                                req.flash('danger', 'An error occured: ' + error);
                                                res.redirect('/funds');
                                            } else {
                                                req.flash('success', 'Funds are withdrawn. It might take a minute to let the blockchain to settle it.');
                                                res.redirect('/funds');
                                            }
                                        });
                                    }
                                });
                            }
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
    if (!MISC_validation(req)) {
        res.redirect('/funds');
    } else {
        if (req.user) {
            // Lets firs check if the user is already doing a transaction on the blockchain
            pool.queryuser(req.user.id, function (error, rows) {
                if (error) {
                    logger.error("#server.funds.post.funds.movetogaming: Error: %s", error);
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
                        if (errstr) {
                            req.flash('danger', errstr);
                            res.redirect('/funds');

                        } else {
                            pool.queryathaddr(req.user.id, async (error, rows, fields) => {
                                athdoWithdraw(rows[0].athaddr, ATHaddress, transferamount, async (error, tx) => {
                                    if (error) {
                                        logger.error("#server.funds.post.funds.movetogaming: Error: %s", error);
                                        req.flash('danger', 'An error occured: ' + error);
                                        res.redirect('/');
                                    } else {
                                        var vsql = "UPDATE user SET athamount=athamount+" + transferamount.toString() + ", blockchaintransact='" + pool.mysqlNow() + "' WHERE id=" + req.user.id;
                                        logger.info("#server.funds.post.funds.movetogaming: SQL: %s", vsql);
                                        pool.query(vsql, function (error, rows1, fields) {
                                            if (error) {
                                                logger.error("#server.funds.post.funds.movetogaming: Error: %s", error);
                                                req.flash('danger', 'An error occured: ' + error);
                                                res.redirect('/');
                                            } else {
                                                var vsql = "INSERT INTO currencytransfer (userid, amount,fromaddr, toaddr, startdate, enddate, status, tx) VALUES ('" + req.user.id + "','" + transferamount + "', '" + req.user.athaddr + "', '" + ATHaddress + "','" + pool.mysqlNow() + "','" + pool.mysqlNow() + "'," + TX_FINISHED + ",'" + tx + "')";
                                                logger.info("#server.funds.post.funds.movetogaming: SQL: %s", vsql);
                                                pool.query(vsql, function (error, rows, fields) {
                                                    if (error) {
                                                        logger.error("#server.funds.post.funds.movetogaming: Error: %s", error);
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
    if (!MISC_validation(req)) {
        res.redirect('/funds');
    } else {

        if (req.user) {
            // Lets firs check if the user is already doing a transaction on the blockchain
            pool.queryuser(req.user.id, function (error, rows) {
                if (error) {
                    logger.error("#server.funds.post.funds.movetotransfer: Error: %s", error);
                    req.flash('success', 'Please logout and in again');
                    res.redirect('/login');
                } else {
                    if (pool.mysqlSecElapsed(rows[0].blockchaintransact) < 60) {
                        // We have a problem, too fast transaction
                        req.flash('danger', 'Wait! Currently You already process with the bloxxchain, wait for 60 sec.');
                        res.redirect('/funds');

                    } else {
                        if (pool.mysqlSecElapsed(rows[0].blockchaintransact) < 604800) {
                            // We have a problem, too fast transaction
                            req.flash('danger', 'You cannot transfer funds from Your hot account for a week from registration. Seconds left: '+ (604800 - pool.mysqlSecElapsed(rows[0].blockchaintransact)));
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
                                errstr = "Transfer amount needs to be positive.";
                            if (errstr) {
                                req.flash('danger', errstr);
                                res.redirect('/funds');

                            } else {
                                transferamount = Number(transferamount) + 0.00242002;
                                pool.queryathaddr(req.user.id, async (error, rows, fields) => {
                                    if (error) {
                                        logger.error("#server.funds.post.funds.movetotransfer: Error: %s", error);
                                        req.flash('success', 'Please logout and in again');
                                        res.redirect('/login');
                                    } else {
                                        logger.info('#server.funds.post.funds.movetotransfer: transferamount=%d', transferamount);
                                        await athdoWithdraw(ATHaddress, rows[0].athaddr, transferamount, async (error, tx) => {
                                            if (error) {
                                                logger.error("#server.funds.post.funds.movetotransfer: Error: %s", error);
                                                req.flash('danger', 'An error occured: ' + error);
                                                res.redirect('/');
                                            } else {
                                                var vsql = "UPDATE user SET athamount=athamount-'" + transferamount.toString() + "' WHERE id=" + req.user.id;
                                                pool.query(vsql, function (error, rows1, fields) {
                                                    var vsql = "INSERT INTO currencytransfer (userid, amount,fromaddr, toaddr, startdate, enddate, status, tx) VALUES ('" + req.user.id + "','" + transferamount + "', '" + ATHaddress + "', '" + req.user.athaddr + "','" + pool.mysqlNow() + "','" + pool.mysqlNow() + "'," + TX_FINISHED + ",'" + tx + "')";
                                                    logger.info("#server.funds.post.funds.movetotransfer: SQL: %s", vsql);
                                                    pool.query(vsql, function (error, rows, fields) {
                                                        if (error) {
                                                            logger.error("#server.funds.post.funds.movetotransfer: Error: %s", error);
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
                                    }
                                });
                            }
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


module.exports = router;
