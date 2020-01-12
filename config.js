//static data to don't have to generate the conf_adata 2 times
let config_data = null;
module.exports = function() {
// if the static data was already set. return it
    if (config_data != null && config_data != undefined) {
        return config_data
    }

    config_data = {}
//LOAD JSON
    if (process.env.NODE_ENV == 'production') {
        config_data = require('./config/config.production.json');
        console.log("... Production");
    } else {
        config_data = require('./config/config.development.json');
        console.log("... Development");
    }
   return config_data
}