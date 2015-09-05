var foduler = require('./foduler1');
var express = require('express')

module.exports = foduler.module('module:web-base')
    .factory('express', function () {
        return express;
    })

    .factory('appFactory', function () {
        var _app;
        return function (app) {
            if (app) _app = app;


            return _app || (_app = express());
        };
    })
    .factory('app', ['appFactory',
        function (appFactory) {
            return appFactory();
        }
    ])

    .factory('module:web-base pager', function () {
        return function (name) {
            return function (req, res, next) {

                var str = req.query[name || 'pagination'];
                var pagination = {}
                if (str) {
                    try {
                        pagination = JSON.parse(str)
                    } catch (e) {

                    }
                }

                var p = pagination.page || pagination.p || 1;
                var l = pagination.limit || pagination.l || 1;
                if (l > 100) l = 100;

                req.pager = {
                    page: p,
                    limit: l,
                    offset: (p - 1) * l
                }
                next()
            }
        }
    })
    .factory('module:web-base ordering', function () {
        return function (name) {

            return function (req, res, next) {

                var str = req.query[name || 'ordering'];
                var ordering = {}
                if (str) {
                    try {
                        var params = JSON.parse(str)

                        for (var k in params) {
                            ordering.field = k;
                            ordering.type = params[k];
                            break
                        }
                    } catch (e) {

                    }


                }


                req.ordering = ordering


                next()
            }
        }
    })

    .factory('module:web-base filtering', function () {
        return function (name) {

            return function (req, res, next) {

                var str = req.query[name || 'filtering'];
                var params = []
                if (str) {
                    try {
                        params = JSON.parse(str)
                    } catch (e) {

                    }


                }

                var groupB = function (data) {
                    return function () {
                        for (var j in data) {
                            var it = data[j]
                            this.orWhere(it.n, it.op, it.vl)
                        }
                    }
                }

                req.filtering = {
                    params: params,
                    whereApply: function (q) {
                        for (var i in params) {
                            var f = params[i];
                            if ('$or' in f && Array.isArray(f['$or'])) {
                                q.where(groupB(f['$or']))
                            } else if ('$and' in f && Array.isArray(f['$and'])) {
                                q.where(groupB(f['$or']))
                            } else
                                q.where(f.n, f.op, f.valid)

                        }


                    }
                }


                next()
            }
        }
    })
