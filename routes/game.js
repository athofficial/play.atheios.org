var express = require('express');
var router = express.Router();
const Mail=require('../mail');

/* GET home page. */
router.get('/addgame', ensureAuthenticated, function(req, res, next) {
    res.render('game_add', {
        title: 'Add game asset'
    });
});

/* GET home page. */
router.get('/editgame', ensureAuthenticated, function(req, res, next) {

    let query = req.query.id;
    console.log(query);

    var sql = "SELECT * FROM gameasset WHERE id = '" + req.query.id + "' AND userid = '"+ req.user.id+"'";
    pool.query(sql, function (error, rows, fields) {
        if (error) {
            if (debugon)
                console.log(' >>> DEBUG SQL failed', error);
            throw error;
        } else {
            if (debugon)
                console.log(rows[0].asset_name);

            var schemeoptions="";
            if (rows[0].asset_scheme=="0.5") {
                schemeoptions+="<option value='0.5' selected>50%, which means 50% go to You, rest to the players</option>";
            }
            else {
                schemeoptions+="<option value='0.5'>50%, which means 50% go to You, rest to the players</option>";
            }
            if (rows[0].asset_scheme=="0.6") {
                schemeoptions+="<option value='0.6' selected>60%, which means 40% go to You, rest to the players</option>";
            }
            else {
                schemeoptions+="<option value='0.6'>60%, which means 40% go to You, rest to the players</option>";
            }
            if (rows[0].asset_scheme=="0.7") {
                schemeoptions+="<option value='0.7' selected>70%, which means 30% go to You, rest to the players</option>";
            }
            else {
                schemeoptions+="<option value='0.7'>70%, which means 30% go to You, rest to the players</option>";
            }
            if (rows[0].asset_scheme=="0.8") {
                schemeoptions+="<option value='0.8' selected>80%, which means 20% go to You, rest to the players</option>";
            }
            else {
                schemeoptions+="<option value='0.8'>80%, which means 20% go to You, rest to the players</option>";
            }
            if (rows[0].asset_scheme=="0.9") {
                schemeoptions+="<option value='0.9' selected>90%, which means 10% go to You, rest to the players</option>";
            }
            else {
                schemeoptions+="<option value='0.9'>90%, which means 10% go to You, rest to the players</option>";
            }
            if (rows[0].asset_scheme=="1") {
                schemeoptions+="<option value='1' selected>All goes to the players</option>";
            }
            else {
                schemeoptions+="<option value='1'>All goes to the players</option>";
            }

            var periodeoptions="";
            if (rows[0].asset_periode=="24") {
                periodeoptions+="<option value='24' selected>1 day to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='24'>1 day to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="48") {
                periodeoptions+="<option value='48' selected>2 day to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='48'>2 day to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="72") {
                periodeoptions+="<option value='72' selected>3 day to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='72'>3 day to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="96") {
                periodeoptions+="<option value='96' selected>4 day to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='96'>4 day to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="148") {
                periodeoptions+="<option value='148' selected>7 day to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='148'>7 day to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="296") {
                periodeoptions+="<option value='296' selected>14 day to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='296'>14 day to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="12") {
                periodeoptions+="<option value='12' selected>12 hours to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='12'>12 hours to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="6") {
                periodeoptions+="<option value='6' selected>6 hours to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='6'>6 hours to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="3") {
                periodeoptions+="<option value='3' selected>3 hours to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='3'>3 hours to leader board resolution</option>";
            }
            if (rows[0].asset_periode=="1") {
                periodeoptions+="<option value='1' selected>1 hour to leader board resolution</option>";
            }
            else {
                periodeoptions+="<option value='1'>1 hour to leader board resolution</option>";
            }

           res.render('game_edit', {
                title: 'Edit game asset',
                gamename: rows[0].asset_name,
                gametoken: rows[0].asset_token,
                gameathaddr: rows[0].asset_athaddr,
                schemeoption: schemeoptions,
                periodeoption: periodeoptions
            });
        }
    });
});

router.get('/currentgame', ensureAuthenticated, function(req, res, next) {
    var sql = "SELECT * FROM gameasset WHERE userid="+req.user.id;
    if (debugon)
        console.log(sql);
    pool.query(sql, function (error, rows, fields) {
        if (error) {
            console.log(error);
            throw(error);
        } else {
            if (debugon)
                console.log(rows.length);

            res.render('game_current', {
                title: 'List over gaming assets',
                gamesnr: rows.length,
                games: rows
            });
        }
    });
});

router.get('/removegame', ensureAuthenticated, function(req, res, next) {
    res.render('game_current', {
        title: 'Remove gaming assets'
    });
});

// Access Control
function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        req.flash('danger', 'Please login');
        res.redirect('/login');
    }
}

router.post('/game_add', function(req, res) {
    const gamename = req.body.gamename;
    const scheme = req.body.scheme;
    const periode = req.body.periode;

    req.checkBody('gamename', 'Name is required').notEmpty();

    let errors = req.validationErrors();
    if(errors){
        res.render('game_add', {
            errors:errors
        });
    } else {
        if(isNaN(scheme) || isNaN(periode)) {
            if (debugon)
                console.log("Issue with input: " + scheme + "," + periode);

            req.flash('danger', 'Please specify scheme and periode with the predefined values.');
            res.redirect('/addgame');
        }
        else {
            // ToDo: Need to do a proper ath address resolution
            var athaddr="0xABC";
            var rand = pool.makeid(50);
            var vsql = "INSERT INTO gameasset (userid, asset_name, asset_scheme, asset_periode, asset_athaddr, asset_token, asset_creation) VALUES ('" + req.user.id + "', '" + gamename + "','" + scheme + "', '" + periode + "', '" + athaddr + "', '" + rand + "', '" + pool.mysqlNow() + "')";
            if (debugon)
                console.log(vsql);
            pool.query(vsql, function (error, rows, fields) {
                if (error) {
                    if (debugon)
                        console.log('>>> Error: ' + error);
                } else {
                    confmail = new Mail();
                    confmail.sendMail(req.user.email, "Atheios GDP: A new asset have been created: "+ gamename, 'You have added a new game asset.');
                    req.flash('info', 'Asset added');
                    res.redirect('/currentgame');
                }
            });


        }
    }
});


router.post('/game_edit', function(req, res) {
    const gamename = req.body.gamename;
    const scheme = req.body.scheme;
    const periode = req.body.periode;
    const gametoken = req.body.gametoken;
    const gameathaddr = req.body.gameathaddr;

    if (debugon)
        console.log("Gametoken", req.body);


    req.checkBody('gamename', 'Name is required').notEmpty();

    let errors = req.validationErrors();
    if(errors){
        res.render('game_add', {
            errors:errors
        });
    } else {
        if(isNaN(scheme) || isNaN(periode)) {
            if (debugon)
                console.log("Issue with input: " + scheme + "," + periode);

            req.flash('danger', 'Please specify scheme and periode with the predefined values.');
            res.redirect('/editgame');
        }
        else {
            var vsql = "UPDATE gameasset SET asset_name='" + gamename + "', asset_scheme='" + scheme + "', asset_periode=" + periode + " WHERE asset_token='" + gametoken +"'";
            if (debugon)
                console.log(vsql);
            pool.query(vsql, function (error, rows, fields) {
                if (error) {
                    if (debugon)
                        console.log('>>> Error: ' + error);
                } else {
                    confmail = new Mail();
                    confmail.sendMail(req.user.email, "Atheios GDP: An existing asset has been updated: "+ gamename, 'You have updated an existing game asset.');
                    req.flash('info', 'Asset Updated');
                    res.redirect('/currentgame');
                }
            });


        }
    }
});

module.exports = router;
