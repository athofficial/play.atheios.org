const express = require('express');
const router = express.Router();
const {athGetBalance, athdoWithdraw} = require('../ath');
const { check, validationResult } = require('express-validator');
const logger = require("../logger");
const {MISC_validation} = require('../misc');
const Mail=require('../mail');


// Login Form
router.get('/gameplay', function(req, res){
    var confmail;
    if (req.user) {

        var vsql = "SELECT * FROM gameasset ORDER BY id DESC";
        pool.query(vsql, function (error, rows, fields) {
            if (error) {
                if (debugon)
                    console.log('>>> Error: ' + error);
                req.flash('danger', 'An error occured: ' + error);
                res.redirect('/');
            } else {
                var vsql = "SELECT ga.*,gp.*, DATE_FORMAT(gp.gameplay_end_date, \"%d/%m/%Y %H:%i:%s\") AS enddate FROM gameplay gp LEFT JOIN gameasset ga ON gp.gameasset_id=ga.id WHERE gp.userid=" + req.user.id + " ORDER BY gameplay_end_date DESC LIMIT 10";


                pool.query(vsql, function (error, rows1, fields) {
                    if (error) {
                        if (debugon)
                            console.log('>>> Error: ' + error);
                        req.flash('danger', 'An error occured: ' + error);
                        res.redirect('/');
                    } else {
                        for (i=0;i<rows1.length;i++) {
                            rows1[i].id
                        }
                        logger.info("rows1: %s", rows1.length);
                        res.render("gameplay", {
                            title: 'Play | Game play',
                            version: version,
                            user: req.user,
                            log: rows1
                        });
                    }
                });
            }
        });
    } else {
        req.flash('success', 'You are logged out');
        res.redirect('/login');
    }
});

module.exports = router;
