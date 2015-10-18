var foduler = require('./foduler1');
var FarcekDb = require('FarcekDB')

module.exports = foduler.module('module:farcek-db')


    .factory('FarcekDb', ['FarcekDb config',
        function (config) {
            if(config)
                return new FarcekDb.container(config);
            throw "not allowed config. inject name 'FarcekDb config' ";
        }
    ])

