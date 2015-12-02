/**
 * Created by Administrator on 11/10/2015.
 */
var foduler = require('./foduler1');


module.exports = foduler.module('fm:mailer')
    .include(require('./module-view-engine'))
    .factory('nodemailer', function () {
        return require('nodemailer');
    })
    .factory('fm:mailer configure', ['swig multiLoader',
        function (swigMultiLoader) {
            var config = {
                debug: false,
                swig: {
                    autoescape: true,
                    varControls: ['[{', '}]'],
                    cmtControls: ['[#', '$]'],
                    tagControls: ['[%', '%]'],
                    cache: 'memory',
                    loader: new swigMultiLoader()
                },

                service: {
                    loop: 10000,
                    wait: 1000
                },
                //smtp: [{
                //    service: "Gmail",
                //    auth: {
                //        user: "gmail.user@gmail.com",
                //        pass: "userpass"
                //    }
                //}],
                smtp: []
            };

            var o = {
                get: function () {
                    return config;
                },
                addSmtp: function (smtpConfig) {
                    config.smtp.push(smtpConfig)
                },
                debug: function (debug) {
                    config.debug = debug;
                },
                addViewPath: function (path) {
                    config.swig.loader.addPath(path);
                }
            }
            return o;
        }
    ])
    .factory('fm:mailer instance', ['nodemailer', 'fm:mailer configure',
        function (nodemailer, configure) {
            return function (options) {


                var transporter, busy = false, timer,
                    ok = function () {
                        var config = configure.get();
                        timer = setTimeout(function () {
                            busy = false;
                            timer = null;
                        }, (config.service && config.service.wait) || 1000);
                    },
                    getTransporter = function () {
                        if (transporter) return transporter;
                        transporter = nodemailer.createTransport(options);

                        return transporter
                    }

                return {
                    busy: function () {
                        return busy;
                    },
                    dispose: function () {
                        if (timer) clearTimeout(timer);
                    },
                    send: function (mailOptions, callback) {
                        if (busy) return callback('instance is busy');
                        busy = true;
                        getTransporter().sendMail(mailOptions, function (error, info) {
                            ok();
                            if (error) {
                                return callback(error);
                            }
                            callback(false, info);
                        });
                    }
                }
            }
        }
    ])
    .factory('fm:mailer queue', function () {
        var queue = [];
        var errors = [];
        return {
            add: function (data) {
                queue.push(data);
            },
            next: function () {
                return queue.shift();
            },
            all: function () {
                return queue;
            }
        };
    })
    .factory('fm:mailer errors', function () {
        var errors = [];
        return {
            add: function (data) {
                errors.push(data);
            },
            all: function () {
                return errors;
            }
        };
    })
    .factory('fm:mailer service', ['fm:mailer configure', 'fm:mailer queue', 'fm:mailer errors', 'fm:mailer instance',
        function (configure, queue, errors, instance) {
            var instances = [], timer, started = false;

            var start = function () {
                if (started) return worker();
                started = true;
                var config = configure.get();
                if (Array.isArray(config.smtp) && config.smtp.length > 0) {
                    config.smtp.forEach(function (it) {
                        instances.push(instance(it));
                    });

                    worker();

                } else throw new Error('not defined `smtp` config. in `fm:mailer configure` facotrys');
            }

            var worker = function () {
                timer = null;
                console.log('call send worker')
                var config = configure.get();

                for (var i = 0; i < instances.length; i++) {
                    var instance = instances[i];
                    if (instance.busy()) continue;

                    var job = queue.next();
                    if (job) {
                        console.log('send request')
                        instance.send(job, function (err, info) {
                            console.log('send result',err,info)
                            if (err) {
                                if (configure.get().debug) {
                                    console.log('mailer debug', 'send error', err)
                                }
                                errors.add({
                                    error: err,
                                    item: job
                                })
                            }
                        });
                    } else return;
                }

                timer = setTimeout(worker, config.service.loop);
            };


            return {
                check: function (data) {

                    start();
                },
                start: function () {
                    console.log('call start')
                    start();
                },
                stop: function () {
                    console.log('call stop')
                    instances.forEach(function (it) {
                        it.dispose();
                    });
                    if (timer) clearTimeout(timer);
                    started = false;
                }
            };
        }
    ])

    .factory('fm:mailer template', ['fm:mailer configure', 'swig',
        function (configure, Swig) {
            var swig = false;

            function tpl(file) {
                if (swig === false) {
                    swig = new Swig.Swig(configure.get().swig);
                }


                return swig.compileFile(file);
            }


            return function (file, locals) {
                return tpl(file)(locals);
            }
        }
    ])
    .factory('fm:mailer mailer', ['fm:mailer queue', 'fm:mailer service', 'fm:mailer template', 'fm:mailer configure',
        function (queue, service, tpl, configure) {
            var o = {
                text: function (mailOptions) {
                    if (configure.get().debug) {
                        console.log('mailer debug', mailOptions)
                    }

                    queue.add(mailOptions);
                    service.check();
                },
                html: function (file, locals, mailOptions) {
                    var html = mailOptions.html = tpl(file, locals);
                    o.text(mailOptions);
                }
            };

            return o;
        }
    ])








