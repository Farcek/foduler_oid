var modules = {};
var values = {};
var events = {};
var factoryInstance = {};

function getModule(name) {
    return modules[name]
}// hehe

function hasFactory(name) {
    for (var i in modules) {
        if (modules[i].$has(name)) {
            return i
        }
    }
    return false
}
function getFactory(name) {

    for (var i in modules) {
        if (modules[i].$has(name)) {
            return modules[i].$get(name)
        }
    }
    throw  'not found factory. find factory name=' + name
}

function factoryValue(name) {
    if (name in factoryInstance) return factoryInstance[name];
    if (name in values) return values[name];

    var factory = getFactory(name);
    return factoryInstance[name] = caller(factory);
}

function on(name, hand) {
    var listener = events[name] || (events[name] = [])
    listener.push(hand);
    return this;
}
function emit(name, params) {
    var results = []
    if (name in events) {
        var listener = events[name];

        for (var i in listener) {
            results.push(caller(listener[i]))
        }
    }

    return Promise.all(results)
}

function caller(hand, params) {
    //console.log('caller',hand)
    if (typeof hand === 'function') {
        return hand();
    }
    if (Array.isArray(hand)) {
        var fn = hand.slice(-1);
        var injects = hand.slice(0, hand.length - 1);

        var dependencies = [];
        for (var i in injects) {
            if (i === 'params')
                dependencies.push(params);
            else
                dependencies.push(factoryValue(injects[i]));
        }

        return fn[0].apply(undefined, dependencies)
    }
}

function foduler(name, reqModules) {

    if (name in modules) throw name + ' <- the named module already registered'

    var self = modules[name] = this;


    var configs = [], runs = [];
    var factories = {}


    this.config = function (handle) {
        configs.push(handle)
        return self
    }
    this.value = function (name, value) {
        values[name] = value;
        return self
    }

    this.factory = function (name, handle) {
        var h = hasFactory(name);

        if (h) throw name + ' <- the name already registered factory. registered module ' + h;
        factories[name] = handle;
        return self
    }

    this.$has = function (name) {
        return name in factories;
    }

    this.$get = function (name) {
        return factories[name];
    }


    this.run = function (handle) {
        runs.push(handle)
        return self
    }

    this.$test = function () {
        for (var i in reqModules || []) {
            var n = reqModules[i];
            if (!(n in modules))
                throw n + '<- not registered module';
        }
    };
    this.$config = function () {

        for (var i in configs) {
            caller(configs[i])
        }
    }
    this.$run = function () {

        for (var i in runs) {
            caller(runs[i])
        }


    }

    this.on = function (name, hand) {
        on(name, hand)
        return self;
    }


}


module.exports.module = function (name, reqModules) {
    return new foduler(name, reqModules)
}
module.exports.start = function () {
    Promise.resolve()
        .then(function () {//test
            var test = []
            for (var k in modules) {
                test.push(modules[k].$test());
            }
            return Promise.all(test)
        })
        .then(function () {
            var configs = []

            for (var k in modules) {
                configs.push(modules[k].$config());
            }

            return Promise.all(configs)
        })

        .then(function () {
            var t = [];
            for (var k in modules) {
                t.push(modules[k].$run());
            }
            return Promise.all(t)
                .then(function () {
                    emit('postRun');
                })
        })


}

var _ = require('lodash');
var Promise = require('bluebird')

var express = require('express');
var app = express();
var FarcekDb = require('FarcekDB')



new foduler('core')
    .value('loading mode', 'www')
    .factory('injector', function () {
        return function (name) {
            return factoryValue(name)
        }
    })
    .factory('$value', function () {
        return function (name) {
            return values[name]
        }
    })
    .factory('_', function () {
        return _;
    })
    .factory('Promise', function () {
        return Promise
    })
    .factory('express', function () {
        return express
    })
    .factory('Router', function () {
        return express.Router
    })
    .factory('emit', function () {
        return function (name, params) {
            return emit(name, params)
        }
    })
    .factory('app', function () {
        return app;
    })
    .factory('FarcekDb', ['FarcekDb config',
        function (config) {
            throw new Error('hhh')
            return new FarcekDb.container(config);
        }
    ])