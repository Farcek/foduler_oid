var _ = require('lodash');
var Promise = require('bluebird')
var defModules = {};

function $$module(name) {
    var configs = [], runs = [];
    var factories = {}, includes = [], events = {}, values = {};

    var module = defModules[name] = {
        value: function (name, value) {
            values[name] = value;
            return this;
        },
        on: function (name, handle) {
            (events[name] || (events[name] = [])).push(handle);

            return this;
        },
        factory: function (name, handle) {
            factories[name] = handle;

            handle.$$module = module;

            return this;
        },
        config: function (handle) {
            configs.push(handle);
            return this;
        },
        include: function () {

            var add = function (m) {
                if (m && (_.isString(m) || _.isFunction(m.$name)))
                    return includes.push(m);
                throw new TypeError('cannot include the module. include request module ' + module.$name());
            }

            for (var i in arguments) {
                var a = arguments[i];
                if (Array.isArray(a)) {
                    for (var j in a) {
                        add(a[j])
                    }
                } else add(a);
            }
            return this;
        },
        run: function (handle) {
            runs.push(handle)
            return this;
        },
        $name: function () {
            return name;
        },
        $reqInclude: function (container) {
            container[module.$name()] = module;

            _.each(includes, function (m) {
                if (_.isString(m)) {
                    if (m in defModules)
                        m = defModules[m]
                    else throw 'Not found defined model. find name =' + name;
                }

                if (m.$name() in container) return;

                container[m.$name()] = m;
                m.$reqInclude(container)
            })
            return container;
        },
        $values: function () {
            return values;
        },
        $factories: function () {
            return factories;
        },
        $configs: function () {
            return configs;
        },
        $runs: function () {
            return runs;
        },
        $events: function () {
            return events;
        }
    }
    return module
}
function $$start(module) {
    var factoryInstance = {},
        events = {}, values = {}, factories = {}
        , modules = {
            system: $$module('system')
                .factory('injector', function () {
                    return function (name) {
                        return factoryValue(name)
                    }
                })
                .factory('$injector', function () {
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

                .factory('emit', function () {
                    return function (name, params) {
                        return emit(name, params)
                    }
                })
        };

    module.$reqInclude(modules)
    eachModule(function (m) {
        _.each(m.$events(), function (e, eventName) {

            var listener = events[eventName] || (events[eventName] = []);

            for (var i in e) {
                listener.push(e[i]);
            }
        })
    }); // reg events

    eachModule(function (m) {
        _.each(m.$values(), function (value, name) {
            if (name in values)
                throw new name + '<- the value already defined. define value request name=' + name;
            values[name] = value;
        })
    })// reg values

    eachModule(function (m) {
        _.each(m.$factories(), function (factory, name) {
            if (name in factories)
                throw name + ' <- the factory already defined. define value request name=' + name;
            factories[name] = factory;
        })
    })// reg factories


    return Promise.resolve()
        .then(function () {
            return execConfigs()
        })
        .then(function () {
            return execRuns()
        })
        .then(function () {
            return module
        })


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

    function eachModule(fn) {
        for (var i in modules) {
            if (fn(modules[i]) === false) break;
        }
    }

    function getFactory(name) {

        if (name in factories) {
            return factories[name];
        }


        throw  'not found factory. find factory name=' + name+'; in module `'+module.$name()+'`'
    }

    function factoryValue(name) {
        if (name in factoryInstance) return factoryInstance[name];
        if (name in values) return values[name];

        var factory = getFactory(name);
        return factoryInstance[name] = caller(factory);
    }

    function caller(hand, params) {

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


    function execConfigs() {
        var configs = []
        eachModule(function (m) {
            _.each(m.$configs(), function (run) {
                configs.push(caller(run))
            })
        })

        return Promise.all(configs)
    }


    function execRuns() {
        var runs = []
        eachModule(function (m) {
            _.each(m.$runs(), function (run) {
                runs.push(caller(run))
            })
        })

        return Promise.all(runs)
            .then(function () {
                return emit('postRun');
            })
    }


}


var foduler = module.exports = {
    module: $$module,
    start: $$start
}