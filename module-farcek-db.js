var foduler = require('./foduler1');
var FarcekDb = require('FarcekDB')

module.exports = foduler.module('module:farcek-db')


    .factory('FarcekDb', ['FarcekDb config',
        function (config) {

            return new FarcekDb.container(config);
        }
    ])

