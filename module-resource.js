var foduler = require('./foduler1');
var multer = require('multer');
var uid = require('uid');
var mime = require('mime-types');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var util = require('util');

function move(oldPath, newPath, callback) {
    fs.rename(oldPath, newPath, function (err) {
        if (err) {
            if (err.code === 'EXDEV') {
                copy();
            } else {
                callback(err);
            }
            return;
        }
        callback();
    });

    function copy() {
        var readStream = fs.createReadStream(oldPath);
        var writeStream = fs.createWriteStream(newPath);

        readStream.on('error', callback);
        writeStream.on('error', callback);
        readStream.on('close', function () {

            fs.unlink(oldPath, callback);
        });

        readStream.pipe(writeStream);

    }
}

function Resource(conf, Promise, log) {

    var upload = multer({dest: conf.temp});

    mkdirp.sync(conf.root);

    return {
        rootPath: conf.root,
        uploadSingle: function (fieldName) {
            var a = upload.single(fieldName);
            var b = function (req, res, next) {
                var file = req.file;
                if (req.file) {
                    req.file.apply = function () {

                        var self = this;
                        var ext = mime.extension(self.mimetype);
                        var fileName = uid(10) + '.' + ext;
                        //var fileName = self.filename + '.' + ext;

                        return new Promise(function (resolve, reject) {
                            move(self.path, path.join(conf.root, fileName), function (err) {
                                if (err) return reject(err);
                                log('', 'move file' + fileName)
                                self.resourceName = fileName;
                                resolve();
                            });
                        })
                            .then(function () {
                                return self;
                            })
                    };

                    req.file.clear = function () {
                        var self = this;
                        return new Promise(function (resolve, reject) {
                            var file;
                            if (self.resourceName) {
                                file = path.join(conf.root, resourceName);
                            } else {
                                file = self.path;
                            }
                            log('resource', 'clear file' + file)
                            fs.unlink(file, function (err) {
                                if (err) return reject(err);
                                resolve();
                            });
                        })
                            .then(function () {
                                return true;
                            })
                    };
                }
                next();
            }
            return [a, b]
        },
        uploadMulti: function (fieldName, maxCount) {

        },
        uploadMultiFields: function (fields) {

        },
        remove: function (resourceName, rejected) {

            if (resourceName) {
                var file = path.join(conf.root, resourceName);
                return new Promise(function (resolve, reject) {
                    fs.unlink(file, function (err) {
                        if (rejected && err) return reject(err);
                        resolve();
                    });
                });
            }
            return new Promise(function (resolve, reject) {
                if (rejected) reject("resource name is null");
                resolve();
            });


        }
    }
}
/**
 * confit format
 *  {
        default: {
            temp: path.join(process.cwd(), 'temp'),
            root: path.join(process.cwd(), 'uploader')
        },
        gallery: {
            temp: path.join(process.cwd(), 'temp'),
            root: path.join(process.cwd(), 'gallery')
        }


    }
 * @type {angular.IModule}
 */
module.exports = foduler.module('module:resource')


    .factory('multer', function () {
        return multer;
    })

    .factory('resource:uploader', ['module:resource:config', 'Promise', 'log',
        function (config, Promise, log) {

            var _default = null;
            for (var section in config) {
                if (_default == null) {
                    _default = Resource(config[section], Promise, log);
                } else
                    _default[section] = Resource(config[section], Promise, log);
            }
            return _default;
        }
    ])
    .factory('resource:manager', ['resource:uploader',
        function (upp) {
            return upp
        }
    ])
    .factory('resource:router', ['module:resource:config', 'resource:uploader', 'Promise', 'log',
        function (config, uploader, Promise, log) {

            return {
                redirect: function (callbak) {
                    return function (req, res, next) {

                        res.send('todo')
                    }
                },
                send: function (callbak) {
                    return function (req, res, next) {
                        Promise.resolve(callbak(req, res))
                            .then(function (image) {
                                var fle;
                                if (image)
                                    fle = path.join(uploader.rootPath, image);

                                if (fle && fs.existsSync(fle))
                                    res.sendFile(fle);
                                else res.sendFile(path.join(__dirname, 'resource/medium.jpg'));
                            })
                            .catch(next)
                    }
                }

            }
        }
    ])





