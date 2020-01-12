var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/whatsnew', function(req, res, next) {
    res.render('whatsnew', {
        title: 'Atheios GDP - What is new',
        version: version
    });
});

module.exports = router;