var _ = require('lodash');
var Promise = require('bluebird');
var stringFormat = require('string-format');

(function () {
    stringFormat.extend(String.prototype);
})();// init system

function $$module(name) {
    var $self, $as, $includes = [], $factories = {}, $runs = [], $name = _.trim(name),
        $values = {}, $configs = [], $events = {};

    return ($self = {
        get $__name() {
            return '$$module';
        },
        get $name() {
            return $name;
        },
        get $container() {
            return $container;
        },
        get $as() {
            return $as || $name;
        },
        get $includes() {
            return $includes;
        },
        get $values() {
            return $values;
        },
        get $configs() {
            return $configs;
        },
        get $factories() {
            return $factories;
        },
        get $runs() {
            return $runs;
        },
        get $events() {
            return $events;
        },

        as: function (as) {
            $as = as;
            return $self;
        },
        include: function (module) {
            if (module && module.$__name === '$$module') {
                $includes.push(module);
                return $self;
            }

            throw 'module bish bna. ' + module;
        },
        value: function (name, value) {
            $values[name] = value;
            return $self;
        },
        on: function (name, handle) {
            ($events[name] || ($events[name] = [])).push(handle);

            return $self;
        },
        config: function (handle) {
            $configs.push(handle);
            return $self;
        },

        factory: function (name, handles) {
            $factories[name] = handles;
            return $self;
        },

        run: function (handles) {
            $runs.push(handles);
            return $self;
        }
    });
}

function $$fodule($module, $instance) {

    var $self = {
        get $name() {
            return $module.$name;
        },
        get $as() {
            return $module.$as;
        },
        get $module() {
            return $module;
        },
        $invoke: function (handle) {
            return $instance.$invoke(handle, $self);
        },
        emit: function (name) {
            var items = []
            var listeners = $module.$events[name] || [];
            _.each(listeners, function (handle) {
                items.push($self.$invoke(handle));
            });

            return Promise.all(items);
        }
    };


    $instance.$fodules[$self.$name] = $self;

    if ($self.$as in $instance.$aliasFodules) {
        throw  '`{srcModule}` nertei module-n `{as}` alias ni `{deffModule}` nertai module-n alias-tai ijilhen bna'.format({
            srcModule: $module.$name,
            deffModule: $instance.$aliasFodules[$module.$as].$module.$name,
            as: $module.$as
        });
    }
    $instance.$aliasFodules[$self.$as] = $self;

    // event register to foduleInstance
    _.each($module.$events, function (e, eventName) {
        var listener = $instance.$events[eventName] || ($instance.$events[eventName] = []);

        for (var i in e) {
            listener.push(e[i]);
        }
    });

    // included module create
    $module.$includes.forEach(function (module) {
        if (!(module.$name in $instance.$fodules)) {
            $$fodule(module, $instance);
        }
    });

    return $self;


}


function $$foduleInstance($instanceName) {
    var $self, $modules = {}, $fodules = {}, $aliasFodules = {}, $factoriesInstances = {}, $events = {};

    //var registerAs = function ($fodule) {
    //    var $module = $fodule.$module;
    //
    //    if ($module.$as in $aliasFodules)
    //        throw  '`{srcModule}` nertei module-n `{as}` alias ni `{deffModule}` nertai module-n alias-tai ijilhen bna'.format({
    //            srcModule: $module.$name,
    //            deffModule: $aliasFodules[$module.$as].$module.$name,
    //            as: $module.$as
    //        });
    //
    //    $aliasFodules[$module.$as] = $fodule;
    //};


    return ($self = {
        get $fodules() {
            return $fodules;
        },
        get $aliasFodules() {
            return $aliasFodules;
        },
        get $events() {
            return $events;
        },
        get $factoriesInstances() {
            return $factoriesInstances;
        },
        register: function (module) {
            if (module.$name in $modules) throw  '`{$instanceName}` nertei foduleInstance dotor `{module}` nertei module burtguulchihsen bna'.format({
                module: module.$name,
                $instanceName: $instanceName
            });

            $modules[module.$name] = true;
        },
        start: function ($module) {
//            console.log('starting `%s`', $module.$name);

            var $fodule = $$fodule($module, $self);

            if (!($module.$name in $fodules))
                throw  "`{$instanceName}` nertei foduleInstance dotor `{module}` nertei module burtgegdeegui bna".format({
                    module: $module.$name,
                    $instanceName: $instanceName
                });

            return Promise.resolve()
                .then(function () {
                    return runConfigs();
                })
                .then(function () {
                    return runRuns();
                })
                .then(function () {
                    return;
                });


        },
        $namer: function (name) {
            var names = name.split(':');
            if (names.length < 3) {
                if (names.length == 1)
                    return {
                        module: false,
                        name: _.trim(names[0])
                    };
                return {
                    module: _.trim(names[0]),
                    name: _.trim(names[1])
                };
            }
            throw 'not supported name';
        },
        $invoke: function (handle, $fodule) {

            //console.log('$invoke 1>', handle, $fodule.$name)

            if (_.isFunction(handle)) {
                return handle.apply($fodule.$module);
            }

            if (_.isArray(handle)) {
                var fn = handle[handle.length - 1], i, dependencies, factoryName, dep;
                if (_.isFunction(fn)) {
                    dependencies = [];
                    for (i = 0; i < handle.length - 1; i++) {
                        factoryName = handle[i];
                        {
                            //console.log('$invoke 2>', factoryName, $fodule.$as);
                            dep = $self.$factoryValue(factoryName, $fodule);

                            // console.log('$invoke dep', factoryName, dep);

                            if (dep) {
                                dependencies.push(dep.result);
                            } else {
                                throw 'not found factory `{0}`'.format(factoryName);
                            }
                        }
                    }
                    return fn.apply($fodule.$module, dependencies);

                    //} else {
                    //    for (i = 0; i < handle.length - 1; i++) {
                    //        factoryName = handle[i];
                    //        dep = $self.$factoryValue(factoryName, $fodule);
                    //        if (dep === false) {
                    //            throw 'not found factory `{0}`'.format(factoryName);
                    //        }
                    //    }
                    //    return;
                }
            }
            throw  'not supported handle';
        },
        $factoryValue: function (factoryName, $fodule) {
            var namer = $self.$namer(factoryName), fodule;
            var lockup = function (name, fodule) {

                var value = (function (module) {

                    if (namer.name in module.$values) {
                        return module.$values[namer.name];
                    }

                    if (namer.name in module.$factories) {
                        var aliasName = module.$as + ':' + name;
                        var moduleName = module.$name + ':' + name;

                        if (aliasName in $factoriesInstances) return $factoriesInstances[aliasName];
                        if (moduleName in $factoriesInstances) return $factoriesInstances[moduleName];

                        var factory = module.$factories[name];
                        var factoriesInstance = $self.$invoke(factory, fodule);

                        $factoriesInstances[aliasName] = factoriesInstance;
                        $factoriesInstances[moduleName] = factoriesInstance;
                        return factoriesInstance;
                    }
                    return false;
                })(fodule.$module);

                //console.log('$v 1>', name, $fodule.$as, v);
                return {
                    result: value
                };
            };

            if (namer.module) {
                if (namer.module in $fodules) {
                    fodule = $fodules[namer.module];
                    return lockup(namer.name, fodule);
                }

                if (namer.module in $aliasFodules) {
                    fodule = $aliasFodules[namer.module];
                    return lockup(namer.name, fodule);
                }

            } else {
                return lockup(namer.name, $fodule);
            }
            return false;
        }

    });

    function emit(name) {
        var items = []
        _.each($fodules, function (fodule) {
            items.push(fodule.emit(name));
        });

        return Promise.all(items);
    }

    function runConfigs() {
        var items = [];
        _.each($fodules, function (fodule) {
            _.each(fodule.$module.$configs, function (handle) {
                items.push($self.$invoke(handle, fodule));
            });
        });
        return Promise.all(items);
    }

    function runRuns() {
        var items = [];
        _.each($fodules, function (fodule) {
            _.each(fodule.$module.$runs, function (handle) {
                items.push($self.$invoke(handle, fodule));
            });
        });
        return Promise.all(items)
            .then(function () {
                return emit('postRun');
            });
    }
}

function foduler($instanceName) {
    var $instance = $$foduleInstance($instanceName);

    return {

        module: function (name) {
            var module = $$module(name, $instance);
            $instance.register(module);
            return module;
        },
        start: function (module) {
            $instance.start(module);
        }
    };
}

module.exports = foduler('default foduleInstance');
module.exports.factory = function ($instanceName) {
    return foduler($instanceName);
};