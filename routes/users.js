const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const {athGetAddress, athGetBalance, athdoWithdraw} = require('../ath');
const Mail=require('../mail');

// Register Form
router.get('/register', function(req, res){
  res.render('register');
});

// Register Proccess
router.post('/register', function(req, res){
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const password2 = req.body.password2;
  const depositaddr = req.body.depositaddr;
  // Some explaining here
  // The option field in the user database
  // bit 0
  // bit 1
  // bit 2 User has asked for 10 ATH deposit <= This is currently switched off
  // bit 3 User has registered but is not yet confirmed

  if (req.body.newuser==="on")
    var option=4+8;
  else
    var option=8;

  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

  let errors = req.validationErrors();
  if(errors){
    res.render('register', {
      errors:errors
    });
  } else {
    // Check if username is already taken
    var sql = "SELECT * FROM user WHERE email = '" + email + "'";
    pool.query(sql, function (error, rows, fields) {
      if (error) {
        if (debugon)
          console.log(' >>> DEBUG SQL failed', error);
        guess_spam = false;
        throw error;
      } else {
        if (rows.length == 0) {
          var sql = "SELECT * FROM user WHERE username = '" + username + "'";
          pool.query(sql, function (error, rows, fields) {
            if (error) {
              if (debugon)
                console.log(' >>> DEBUG SQL failed', error);
              guess_spam = false;
              throw error;
            } else {
              if (rows.length == 0) {
                bcrypt.genSalt(10, function (err, salt) {
                  bcrypt.hash(password, salt, function (err, hash) {
                    if (err) {
                      console.log(err);
                    }


                    // write to database
                    var date;
                    date = new Date();
                    date = date.getUTCFullYear() + '-' +
                        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
                        ('00' + date.getUTCDate()).slice(-2) + ' ' +
                        ('00' + date.getUTCHours()).slice(-2) + ':' +
                        ('00' + date.getUTCMinutes()).slice(-2) + ':' +
                        ('00' + date.getUTCSeconds()).slice(-2);
                    var rand = makeid(50);
                    var vsql = "INSERT INTO user (username, email, password, depositaddr, athamount, logincnt, lastlogin, register, rand, options) VALUES ('" + username + "','" + email + "', '" + hash + "', '" + depositaddr + "', 0, 0,'" + date + "','" + date + "', '" + rand + "'," + option + ")";
                    console.log(vsql);
                    pool.query(vsql, function (error, rows, fields) {
                      if (error) {
                        if (debugon)
                          console.log('>>> Error: ' + error);
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


// Confirmation Proccess
router.get('/activate', function(req, res){
  var option=0;

  console.log(">>>> Debug (fn=activate): ",req.query.id);
  var sql = "SELECT * FROM user WHERE rand = '" + req.query.id + "'";
  pool.query(sql, function (error, rows, fields) {
    if (error) {
      if (debugon)
        console.log(' >>> DEBUG SQL failed', error);
      guess_spam = false;
      throw error;
    }
    if (rows.length == 1) {
      if(rows[0].options&8==0) {
        req.flash('danger', 'Account already activated.');
        res.redirect('/register');
      } else {
        var newoption = rows[0].options & 247;
        var athamount = 0;
        if (rows[0].options & 4) {
          athamount = 10;
          athdoWithdraw(NEWUSERFUNDaddress, ATHaddress, athamount, async (error, tx) => {
            if (error) {
              req.flash('danger', 'An error occured: ' + error);
              res.redirect('/manage');
            } else {
              if (debugon) {
                console.log(">>>> DEBUG NEWUSER fund transfer, 10ATH", tx);
              }
              pool.logging(rows[0].id, athamount.toString() + " ATH are credited as new user bonus to Your gamedev account.");
            }

          });
        } else
          athamount = 0;

        athGetAddress(async (error, athaddress) => {
          if (error) {
            if (debugon)
              console.log(' >>> DEBUG athGetAddress failed', error);
          } else {
            var vsql = "UPDATE user SET athaddr='" + athaddress + "', athamount=" + athamount + ", options=" + newoption + " WHERE rand='" + req.query.id+"'";
            console.log(vsql);
            pool.query(vsql, function (error, rows, fields) {
              if (error) {
                if (debugon)
                  console.log('>>> Error: ' + error);
              }
              else {
                req.flash('success', 'Account is activated');
                res.redirect('/login');
              }
            });
          }

        });
      }
    }
  });
});



// Register Proccess
router.post('/update', function(req, res){
  if (req.user) {
    const name = req.body.name;
    const email = req.body.email;
    const athaddress = req.body.athaddress;
    const depositaddr = req.body.depositaddr;

    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();

    let errors = req.validationErrors();

    if (errors) {
      res.render('account', {
        title: 'GDP | Account update',
        version: version,
        errors: errors
      });
    } else {
      var vsql = "UPDATE user SET user='" + name + "', email='" + email + "', depositaddr='" + depositaddr +"' WHERE id=" + req.user.id;
      console.log(vsql);
      pool.query(vsql, function (error, rows, fields) {
        if (error) {
          if (debugon)
            console.log('>>> Error: ' + error);
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

// Register Proccess
router.post('/preferences', function(req, res){
  var option=0;

  if (req.body.keys==="arrow") {
    option|=2;
  }
  else {
    option&=253;
  }

  if (req.body.theme==="dark") {
    option|=1;
  }
  else {
    option&=254;
  }
  if (req.user) {
    var vsql = "UPDATE user SET options="+option+" WHERE id=" + req.user.id;
    console.log(vsql);
    pool.query(vsql, function (error, rows, fields) {
      if (error) {
        if (debugon)
          console.log('>>> Error: ' + error);
      }
    });
    req.flash('success', 'Account is updated');
    res.redirect('/account');
  }
  else {
    req.flash('success', 'User logged out');
    res.redirect('/login');

  }
});



// Register Proccess
router.post('/updatepassword', function(req, res) {
  const password = req.body.password;
  const password2 = req.body.password2;
  if (req.user) {

    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

    let errors = req.validationErrors();

    if (errors) {
      res.render('account', {
        title: 'GDP | Account update',
        version: version,
        errors: errors
      })
    } else {
      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, function (err, hash) {
          if (err) {
            console.log(err);
          }
          // write to database
          var vsql = "UPDATE user SET password='" + hash + "' WHERE id=" + req.user.id;
          pool.query(vsql, function (error, rows, fields) {
            if (error) {
              if (debugon)
                console.log('>>> Error: ' + error);
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

  if (req.user) {
    var vsql="SELECT * FROM user WHERE id="+req.user.id;

    pool.query(vsql, function (error, rows, fields) {
      if (error) {
        if (debugon)
          console.log('>>> Error: ' + error);
      }

      if (rows[0].options&&1)
        darkmode=true;
      else
        darkmode=false;
      if (rows[0].options&&2)
        keyprefs=true;
      else
        keyprefs=false;
      athGetBalance(rows[0].athaddr, async(error,amount) => {
        res.render("account", {
          title: 'GDP | Account',
          version: version
        });
      });
    });
  } else {
    req.flash('success', 'You are logged out');
    res.redirect('/login');

  }


});

// Login Process
router.post('/login', function(req, res, next){
  var sql = "SELECT * FROM user WHERE username = '" + req.body.username + "'";
  pool.query(sql, function (error, rows, fields) {
    if (error) {
      if (debugon)
        console.log(' >>> DEBUG SQL failed', error);
      guess_spam = false;
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
});

// logout
router.get('/logout', function(req, res){
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/login');
});

function makeid(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


module.exports = router;
