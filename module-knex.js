var foduler = require('./foduler1');
var knex = require('knex')

module.exports = foduler.module('module:knex')
    .factory('knex', function () {
        return knex;
    })


