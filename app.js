"use strict";


var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');

// Define the globals
global.debugon=true;
global.version="0.1.1";

// Init database
if (global.config.development) {
    global.baseurl="http://localhost:"+global.config.PORT;
}
else {
    global.baseurl="https://play.atheios.org";
};

// Instatiate database
const Database=require('./database');
global.pool=new Database();

global.ATHaddress=global.config.ATHADDRESS;

// Define express and routes
let indexRouter = require('./routes/index');
let whatsnew = require('./routes/whatsnew');
let users = require('./routes/users');
let gamesRouter = require('./routes/game');
let contactRouter = require('./routes/contact');
let funds = require('./routes/funds');
let statsrouter = require('./routes/stats');
let gameplayrouter = require('./routes/gameplay');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Body Parser Middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));
// Set Bootstrap Folder
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
// Set Bootstrap Folder
app.use(express.static(path.join(__dirname, 'node_modules/jquery')));

// Express Session Middleware
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});


// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
  res.locals.user = req.user || null;
  next();
});


app.use(logger('dev'));
app.use(express.json());
app.set('json spaces', 2)
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/', whatsnew);
app.use('/', users);
app.use('/', gamesRouter);
app.use('/', contactRouter);
app.use('/', statsrouter);
app.use('/', gameplayrouter);

app.use('/', funds);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = config.development ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;