var foduler = require('./foduler1');

module.exports = foduler.module('module:knex')
    .factory('knex', function () {
        return require('knex');
    })


