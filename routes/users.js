const express = require('express');
const router = express.Router();
const logger = require("../logger");
const bcrypt = require('bcryptjs');
const passport = require('passport');
const {athGetAddress, athGetBalance, athdoWithdraw} = require('../ath');
const Mail=require('../mail');
const {MISC_validation, MISC_makeid, MISC_maketoken} = require('../misc');
const { check } = require('express-validator');

// Register Form
router.get('/register', function(req, res){
  res.render('register', {
    title:'Portal | Register',
    version: version
  });

});

// Register Form
router.get('/reset', function(req, res){
  res.render('reset', {
    title:'Portal | Reset',
    version: version
  });
});

// Reset Form
router.get('/resetpassword', function(req, res){
  res.render('resetpassword', {
    title:'Portal | Password reset procedure',
    version: version
  });
});

// Register Proccess
router.post('/register', [
  check('email', 'Email is not valid').isEmail().isLength({min:3, max:255}).withMessage('The email should be between 3 and 255 char long'),
  check('displayname', 'Displayname is required').notEmpty().isLength({min:3, max:20}).withMessage('The display name should be between 3 and 20 char long'),
  check('username', 'Username is required').notEmpty().isLength({min:3, max:20}).withMessage('The user name should be between 3 and 20 char long'),
  check('password', 'Password is required').notEmpty().isLength({min:3, max:255}).withMessage('The password should be between 3 and 20 char long')
],function(req, res){
  const email = req.body.email;
  const username = req.body.username;
  const displayname = req.body.displayname;
  const password = req.body.password;
  const depositaddr = req.body.depositaddr;
  // Some explaining here
  // The option field in the user database
  // bit 0
  // bit 1
  // bit 2 User has asked for 10 ATH deposit
  // bit 3 User has registered but is not yet confirmed
  var option;
  if (req.body.newuser==="on")
    option=4+8;
  else
    option=8;


  if (!MISC_validation(req)) {
    res.redirect('/register');
  } else {
    // Check if username is already taken
    var sql = "SELECT * FROM user WHERE email = " + pool.escape(email);
    logger.info("SQL: %s", sql);
    pool.query(sql, function (error, rows, fields) {
      if (error) {
        logger.error('#server.users.post.register: Error %s', error);
        throw error;
      } else {
        if (rows.length == 0) {
          var sql = "SELECT * FROM user WHERE username = " + pool.escape(username);
          logger.info("SQL: %s", sql);
          pool.query(sql, function (error, rows, fields) {
            if (error) {
              logger.error('#server.users.post.register: Error %s', error);
              throw error;
            } else {
              if (rows.length == 0) {
                bcrypt.genSalt(10, function (err, salt) {
                  bcrypt.hash(password, salt, function (err, hash) {
                    if (err) {
                      logger.error('#server.users.post.register: Error %s', err);
                    }
                    var rand = makeid(50);
                    var vsql = "INSERT INTO user (username, displayname, email, password, depositaddr, athamount, logincnt, lastlogin, register, rand, options) VALUES (" + pool.escape(username) + "," + pool.escape(displayname) + "," + pool.escape(email) + ", '" + hash + "', " + pool.escape(depositaddr) + ", 0, 0,'" + pool.mysqlNow() + "','" + pool.mysqlNow() + "', '" + rand + "'," + option + ")";
                    logger.info("SQL: %s", vsql);
                    pool.query(vsql, function (error, rows, fields) {
                      if (error) {
                        logger.error('#server.users.post.register: Error %s', error);
                        throw error;
                      } else {
                        confmail = new Mail();
                        confmail.sendMail(email, "Atheios game account activation", 'Welcome to https://play.atheios.org. Please confirm Your mail by clicking this link: ' + baseurl + '/activate?id=' + rand + ' .');
                        req.flash('success', 'Account is registered, but needs to be activated. Check Your email address: ' + email);
                        res.redirect('/account');
                      }
                    });
                  });
                });
              } else {
                req.flash('danger', 'The username is already taken.');
                res.redirect('/register');
              }
            }
          });
        } else {
          req.flash('danger', 'Email is already taken.');
          res.redirect('/register');
        }
      }
    });
  }
});


// logout
router.get('/logout', function(req, res){
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/login');
});

// Confirmation Proccess
router.get('/activate', function(req, res){
  var option=0;

  logger.info("#server.routes.users.get.activate: id: %s",req.query.id);
  var sql = "SELECT * FROM user WHERE rand = " + pool.escape(req.query.id);
  logger.info("#server.routes.users: SQL: %s", sql);
  pool.query(sql, function (error, rows, fields) {
    if (error) {
      logger.error("#server.routes.users.get.activate: %s",error);
      throw error;
    }
    if (rows.length == 1) {
      if(rows[0].options&8==0) {
        req.flash('danger', 'Account already activated.');
        res.redirect('/register');
      } else {
        // clear the activation pending flag
        var newoption = rows[0].options & 247;
        var athamount = 0;
        if (rows[0].options & 4) {
          athamount = 10;
        }

        athGetAddress(async (error, athaddress) => {
          if (error) {
            logger.error("#server.routes.users.get.activate: %s",error);
            throw error;
          } else {
            // If this is a new account and it has been requested to get 10 ATH then we move the 10ATH
            // to the playpot address and we add 10 ATH to the users hot address
            if (athamount>0) {
              athdoWithdraw(config.NEWUSERFUNDADDRESS, config.ATHADDRESS, athamount, async (error, tx) => {
                if (error) {
                  logger.error("#server.routes.users.get.activate: %s",error);
                  req.flash('danger', 'An error occured: ' + error);
                  res.redirect('/manage');
                } else {
                  logger.info("#server.routes.users.get.activate: 10 ATH transferred: %s", tx);
                  var vsql = "UPDATE user SET athaddr='" + athaddress + "', athamount="+ athamount +", options=" + newoption + " WHERE rand='" + req.query.id + "'";
                  logger.info("server.routes.users.get.activate: SQL: %s", vsql);
                  pool.query(vsql, function (error, rows, fields) {
                    if (error) {
                      logger.error("#server.routes.users.get.activate: %s",error);
                      throw error;
                    } else {
                      req.flash('success', 'Account is activated');
                      res.redirect('/login');
                    }
                  });

                }

              });
            } else {
              // In no money needs to be moved and we activate the account
              var vsql = "UPDATE user SET athaddr='" + athaddress + "', athamount=0, options=" + newoption + " WHERE rand='" + req.query.id + "'";
              logger.info("#server.routes.users.get.activate: SQL: %s", vsql);
              pool.query(vsql, function (error, rows, fields) {
                if (error) {
                  logger.error("#server.routes.users.get.activate: %s",error);
                  throw error;
                } else {
                  req.flash('success', 'Account is activated');
                  res.redirect('/login');
                }
              });

            }

          }

        });
      }
    } else {
      logger.error("#server.routes.users.get.activate: Number of matches to large: %s",rows.length);
      req.flash('danger', 'Account problem. Please contact: contact@atheios.org');
      res.redirect('/login');

    }
  });
});



// Register Proccess
router.post('/update', [
  check('name', 'Name is required').notEmpty(),
  check('email', 'Email is required').notEmpty(),
  check('email', 'Email is not valid').isEmail()
], function(req, res){
  if (req.user) {
    const name = req.body.name;
    const email = req.body.email;
    const athaddress = req.body.athaddress;
    const depositaddr = req.body.depositaddr;


    if (!MISC_validation(req)) {
      res.redirect('/account');
    } else {
      var vsql = "UPDATE user SET user='" + name + "', email='" + email + "', depositaddr='" + depositaddr +"' WHERE id=" + req.user.id;
      logger.info("SQL: %s", vsql);
      pool.query(vsql, function (error, rows, fields) {
        if (error) {
          logger.error('#server.funds.post.update: Error %s', error);
          throw error;
        }
      });
      req.flash('success', 'Account is updated');
      res.redirect('/account');
    }
  }
  else {
    req.flash('success', 'User logged out');
    res.redirect('/login');

  }
});


// Reset password Process
router.post('/resetpassword', [
  check('username').isLength({min:3,max:20})
],function(req, res, next){
  if (!MISC_validation(req)) {
    res.redirect('/login');
  } else {
    var sql = "SELECT * FROM user WHERE username = " + pool.escape(req.body.username);
    pool.query(sql, function (error, rows, fields) {
      if (error) {
        if (debugon)
          logger.error('Error: %s', error);
        throw error;
      }
      if (rows.length == 1) {
        if ((rows[0].options & 8) == 1) {
          req.flash('danger', 'You try to reset an account which is not yet activated.');
          res.redirect('/login');
        } else {

          // send a mail and move to the password resetting procedure
          var rand = MISC_makeid(50);
          // write to database
          var vsql = "UPDATE user SET reset='" + rand + "', resetcnt=resetcnt+1 WHERE id=" + rows[0].id;
          pool.query(vsql, function (error, rows1, fields) {
            if (error) {
              if (debugon)
                logger.error('Error: %s', error);
            }
            confmail = new Mail();
            confmail.sendMail(rows[0].email, "Atheios game developer account reset", 'You have requested a password reset from ' + config.httphost + '.\nYour reset code is: ' + rand + ' .');
          });


          req.flash('danger', 'We sent an email to Your registered email address. Check Your email for the reset code.');
          res.redirect('/resetpassword');
        }
      } else {
        // send a mail and move to the poaasword resetting procedure
        req.flash('danger', 'We cannot find Your username. Check Your email for the registration mail or contact our support.');
        res.redirect('/login');
      }

    });
  }
});


// Reset password Process
router.post('/resendusername', [
  check('email').isEmail(),
  check('email').notEmpty()
],function(req, res, next) {
  const email = req.body.email;
  if (!MISC_validation(req)) {
    res.redirect('/login');
  } else {

    var sql = "SELECT * FROM user WHERE email = " + pool.escape(email);
    pool.query(sql, function (error, rows, fields) {
      if (error) {
        if (debugon)
          logger.error('Error: %s', error);
        throw error;
      }
      if (rows.length == 1) {
        if ((rows[0].options & 8) == 1) {
          req.flash('danger', 'You try to query an account which is not yet activated.');
          res.redirect('/login');
        } else {

          confmail = new Mail();
          confmail.sendMail(rows[0].email, "Atheios game developer account", 'You have requested Your username from ' + config.httphost + '.\nYour username is: ' + rows[0].username + ' .');
        }


        req.flash('danger', 'We sent Your login name to Your email address.');
        res.redirect('/login');
      }
    });
  }
});

// Register Proccess
router.post('/resettedpassword', [
  check('password').notEmpty(),
  check('password2').notEmpty()
],function(req, res) {
  const password = req.body.password;
  const password2 = req.body.password2;

  if (password === password2) {
    // Check if resetcode is the one we sent
    var sql = "SELECT * FROM user WHERE reset =" + pool.escape(req.body.resetcode);
    logger.info("SQL: %s", sql);
    pool.query(sql, function (error, rows, fields) {
      if (error) {
        if (debugon)
          logger.error('Error: %s', error);
        throw error;
      }
      if (rows.length == 1) {
        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(password, salt, function (err, hash) {
            if (err) {
              logger.error("BCRyPT error: %s", err);
            }
            // write to database
            var vsql = "UPDATE user SET password='" + hash + "' WHERE id=" + rows[0].id;
            logger.info("SQL: %s", vsql);
            pool.query(vsql, function (error, rows, fields) {
              if (error) {
                if (debugon)
                  logger.error('Error: %s', error);
                throw error;
              }
              req.flash('success', 'Account update');
              res.redirect('/account');

            });
          });
        });
      } else {
        req.flash(danger, 'Reset code is not matching');
        res.redirect('/resetpassword');
      }
    });
  } else {
    req.flash(danger, 'Passwords are not alike! Please retype.');
    res.redirect('/resetpassword');
  }
});


// Register Proccess
router.post('/updatepassword', [
  check('password', 'Password is required').notEmpty(),
  check('password2', 'Passwords is required').notEmpty
],function(req, res) {
  const password = req.body.password;
  const password2 = req.body.password2;

  if (req.user) {
    if (!MISC_validation(req)) {
      res.redirect('/account');
    } else {
      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, function (err, hash) {
          if (err) {
            logger.error('Error: %s', err);
          }
          // write to database
          var vsql = "UPDATE user SET password='" + hash + "' WHERE id=" + pool.escape(req.user.id);
          logger.info("SQL: %s", vsql);
          pool.query(vsql, function (error, rows, fields) {
            if (error) {
              logger.error('#server.fundss.post.updatepassword: Error %s', error);
              throw error;
            }
          });
          req.flash('success', 'Account update');
          res.redirect('/users/account');
        });
      });
    }
  }
  else {
    req.flash('success', 'User logged out');
    res.redirect('/users/login');

  }
});


// Login Form
router.get('/login', function(req, res){
  res.render('login', {
    title:'GDP | Account',
    version: version
  });
});

// Login Form
router.get('/register', function(req, res){
  var captcha=true;
  res.render('register', {
    title:'GDP | Account',
    version: version,
    captcha: true
  });
});



// Login Form
router.get('/account', function(req, res){
  var darkmode;
  var keyprefs;
  var confmail;

  if (req.user) {
    var vsql="SELECT * FROM user WHERE id="+req.user.id;

    pool.query(vsql, function (error, rows, fields) {
      if (error) {
        logger.error('#server.users.get.account: Error %s', error);
        throw error;
      }

      athGetBalance(rows[0].athaddr, async(error,amount) => {
        if (error || amount == null) {
          res.render("error", {
            title: 'GDP | Account',
            version: version,
            message: "Atheios blockchain connection not working",
            error: error
          });
          confmail = new Mail();
          confmail.sendMail('play@atheios.org', "Atheios PLAY error", error + '\nDetails:\n' + error.stack);
        } else {
          res.render("account", {
            title: 'GDP | Account',
            version: version
          });
        }
      });
    });
  } else {
    req.flash('success', 'You are logged out');
    res.redirect('/login');
  }
});

// Login Process
router.post('/login', [
  check('username').isLength({min:3,max:20}).withMessage("Check the length of the username."),
  check('password').notEmpty().withMessage("Please specify password")
],function(req, res, next){

  if (!MISC_validation(req)) {
    res.redirect('/login');
  } else {
    var sql = "SELECT * FROM user WHERE username =" + pool.escape(req.body.username);
    logger.info("#server.user.get.login: SQL: %s", sql);
    pool.query(sql, function (error, rows, fields) {
      if (error) {
        logger.error('#server.users.post.login: Error %s', error);
        throw error;
      }
      if (rows.length == 1 && (rows[0].options & 8) == 0) {
        passport.authenticate('local', {
          successRedirect: '/',
          failureRedirect: '/login',
          failureFlash: true
        })(req, res, next);
      } else {
        req.flash('danger', 'Your account seems either not to be activated or Your username or password are wrong. Check Your email for the activation code.');
        res.redirect('/login');
      }
    });
  }
});

// Register Proccess
router.post('/updatepassword', [
  check('password').notEmpty().withMessage("Please specify password"),
  check('password2').notEmpty().withMessage("Please specify password")
], function(req, res) {
  const password = req.body.password;
  const password2 = req.body.password2;
  if (req.user) {


    if (!MISC_validation(req)) {
      res.redirect('/account');
    } else {
      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, function (err, hash) {
          if (err) {
            logger.error('Error: %s', err);
          }
          // write to database
          var vsql = "UPDATE user SET password='" + hash + "' WHERE id=" + pool.escape(req.user.id);
          pool.query(vsql, function (error, rows, fields) {
            if (error) {
              logger.error('#server.funds.post.updatepassword: Error %s', error);
              throw error;
            }
          });
          req.flash('success', 'Account update');
          res.redirect('/users/account');
        });
      });
    }
  }
  else {
    req.flash('success', 'User logged out');
    res.redirect('/users/login');

  }
});




function makeid(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}



module.exports = router;
