var foduler = require('./foduler1');


module.exports = foduler.module('f:utils date')
    .run(function () {
        require('date-utils');
    })


