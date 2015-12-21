var foduler = require('./foduler1');


module.exports = foduler.module('module:web-base')
    .factory('express', function () {
        return require('express');
    })
    .factory('session', function () {
        return require('express-session');
    })
    .factory('favicon', function () {
        return require('serve-favicon');
    })
    .factory('morgan', function () {
        return require('morgan');
    })
    .factory('body-parser', function () {
        return require('body-parser');
    })
    .factory('cookie-parser', function () {
        return require('cookie-parser');
    })

    .factory('appFactory', ['express', function (express) {
        var _app;
        return function (app) {
            var _app = app || (_app = express());

            _app.disable('x-powered-by');
            return _app;
        };
    }])
    .factory('app', ['appFactory',
        function (appFactory) {

            return appFactory();
        }
    ])

    .factory('routerFactory', ['app', 'express',
        function (app, express) {
            /***
             * options.app | options.base
             * options.before | options.middleware
             */
            return function (path, options) {
                options = options || {};
                var router = express.Router();
                var base = options.base || options.app || app;
                var before = options.before || options.middleware;
                if (before) {
                    base.use(path, before, router);
                } else {
                    base.use(path, router);
                }
                return router;
            }
        }
    ])

    .factory('m:w promise-express', ['Promise', function (Promise) {
        return function (req, res, next) {
            res.promiseJson = function (fn) {
                Promise.try(fn)
                    .then(function (result) {
                        res.json(result);
                    })
                    .catch(function (err) {
                        res.status(err.status || 500);
                        res.json({
                            name: err.name,
                            message: err.message || err,
                            errors: err.errors
                        })
                    })
            }
            res.promiseHtml = function () {
                throw 'todo html'
            }
            next();
        }
    }])
    .factory('module:web-base tools', ['module:web-base pager', 'module:web-base ordering', 'module:web-base filtering',
        function (pager, order, filter) {
            return {
                pager: pager, order: order, filter: filter
            }
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
                var groupOr = function (data) {

                    return function () {
                        var q = this;

                        data.forEach(function (it) {
                            if (it) {
                                var n = it.n || it.name || it.field;
                                var v = it.v || it.vl || it.value;
                                var op = it.op || it.operator;
                                if (n && op)
                                    q.orWhere(n, op, v)
                            }

                        })
                    }
                }

                req.filtering = {
                    params: params,
                    whereApply: function (q) {
                        if (Array.isArray(params)) {
                            params.forEach(function (it) {

                                if (it)
                                    if ('$or' in  it) {
                                        q.where(groupOr(it.$or))
                                    } else {
                                        console.log('and q', it)
                                        var n = it.n || it.name || it.field;
                                        var v = it.v || it.vl || it.value;
                                        var op = it.op || it.operator;
                                        if (n && op)
                                            q.where(n, op, v)
                                    }
                            })
                        }
                        return q;


                    }
                }


                next()
            }
        }
    })
