const express = require('express');
const router = express.Router();
const Database=require('../database');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const {athGetAddress, athGetBalance, athdoWithdraw} = require('../ath');
const { check, validationResult } = require('express-validator');
const logger = require("../logger");

// Serve stats page
router.get('/stats', function(req, res){
    var vsql = "SELECT *, DATE_FORMAT(register, \"%d/%m/%Y %H:%i:%s\") AS startdate FROM user ORDER BY register";
    pool.query(vsql, function (error, rows, fields) {
        if (error) {
            if (debugon)
                console.log('>>> Error: ' + error);
            req.flash('danger', 'An error occured: ' + error);
            res.redirect('/');
        } else {
            var count = 0;
            for (var i = 0; i < rows.length; i++) {
                count += rows[0].logincnt;

            }
            res.render("stats", {
                title: 'Play | Statistics',
                version: version,
                registeredUser: rows.length,
                logincnt: count
            });
        }
    });
});

module.exports = router;