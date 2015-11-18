var foduler = require('./foduler1');


module.exports = foduler.module('f:utils string')
    .factory('stringFormat', function () {
        return require('string-format');
    })
    .run(['stringFormat',
        function (stringFormat) {
            stringFormat.extend(String.prototype);
        }
    ])


