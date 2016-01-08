/**
 * Created by Administrator on 12/26/2015.
 */

var foduler = require('./foduler1');
var mkdirp = require('mkdirp');
var path = require('path');
var multer = require('multer');
var mv = require('mv');
var Jimp = require("jimp");
var mime = require('mime-types');
var uid = require('uid');
var fs = require('fs');


module.exports = foduler.module('module:rs')
    .factory('rs configure', [
        function () {
            var self;
            var _rootDir = false;
            var _tempDir = false;
            return self = {
                get rootDir() {
                    if (_rootDir === false)
                        _rootDir = path.join(process.cwd(), 'rs');
                    return _rootDir;
                },
                setRootDir: function (rootDir) {
                    _rootDir = rootDir;
                },

                get tempDir() {
                    if (_tempDir === false) {
                        _tempDir = path.join(self.rootDir, '_tmp');
                        mkdirp(_tempDir, function (err) {
                            if (err) console.error('cannot create rs _tempDir', err);
                        });
                    }

                    return _tempDir;
                }
            }
        }
    ])
    .factory('rs manager', ['rs configure', 'Promise', '_',
        function (configure, Promise, _) {

            var uploader = (function () {
                var t = false;

                return function () {
                    if (t === false) {

                        var storage = multer.diskStorage({
                            destination: function (req, file, cb) {
                                cb(null, configure.tempDir)
                            },
                            filename: function (req, file, cb) {

                                var ext = path.extname(file.originalname);

                                var name = "{field}-{rand}-{uid}-{date}{ext}".format({
                                    field: file.fieldname,
                                    rand: _.random(10000, 99999),
                                    uid: uid(),
                                    date: new Date().getTime(),
                                    ext: (ext === '.' || ext === '') ? '' : ext
                                })

                                cb(null, name)
                            }
                        })

                        t = multer({storage: storage});
                    }
                    return t;
                }
            })();

            return {
                /**
                 *
                 * @param config.dir required
                 * @param config.resolutions || config.sizes optional
                 * {
                 *      small : [120,100],
                 *      large : [1200,800],
                 * }
                 * or
                 * {
                 *      small : {w:120,h:100},
                 *      large : {w:1200,h:800},
                 * }
                 *
                 * @param config.resizeMode string optional
                 * values: normal || fillBlur || fillColor
                 * default: normal
                 *
                 * @param config.resizeBg number optional
                 * default : 0xFFFFFFFF
                 */
                factory: function (config) {

                    if (!('dir' in config)) throw 'not found dir';

                    var self,
                        dir = (function () {
                            if (path.isAbsolute(config.dir)) {
                                return config.dir;
                            }
                            return path.join(configure.rootDir, config.dir);
                        })();

                    config.resizeMode = config.resizeMode || 'normal'
                    config.resizeBg = config.resizeBg || 0xFFFFFFFF


                    mkdirp(dir, function (err) {
                        if (err) console.error('cannot create rs dir', err);
                    });


                    var resolutions = (function () {

                        var sizes = config.resolutions || config.sizes;
                        if (sizes) {
                            var sizeNames = Object.keys(sizes);
                            sizeNames.forEach(function (it) {
                                mkdirp(path.join(dir, it), function (err) {
                                    if (err) console.error('cannot create rs sub dir', err);
                                });
                            });
                            return {
                                lockup: function (resolution) {
                                    if (resolution && sizes[resolution]) {
                                        var t = sizes[resolution];
                                        if (Array.isArray(t))
                                            return {
                                                w: t[0],
                                                h: t[1],
                                            }

                                        if (t.w && t.h) return {
                                            w: t.w,
                                            h: t.h
                                        }
                                    }
                                },
                                get sizeNames() {
                                    return sizeNames;
                                }
                            }
                        }

                        return false

                    })();

                    return self = {
                        get uploader() {
                            return {
                                single: function (fieldname) {
                                    return uploader().single(fieldname)
                                },
                                array: function (fieldname, maxCount) {
                                    return uploader().array(fieldname, maxCount)
                                },
                                fields: function (fields) {
                                    return uploader().fields(fields)
                                },
                                any: function () {
                                    return uploader().any()
                                }
                            }
                        },
                        /**
                         *
                         * @param tmpFile
                         * @param options.nameBuilder function option
                         * @returns {name,path}
                         */
                        apply: function (tmpFile, options) {
                            options = options || {}


                            var nameBuilder = options.nameBuilder || function () {
                                    return path.basename(tmpFile);
                                };

                            return Promise.try(nameBuilder)
                                .then(function (fileName) {
                                    fileName = fileName.toString();
                                    var src = (function (f) {
                                        if (path.isAbsolute(f)) {
                                            return f;
                                        }
                                        return path.join(configure.tempDir, f);
                                    })(tmpFile);

                                    return new Promise(function (resolve, reject) {
                                        var fullPath = path.join(dir, fileName)
                                        mv(src, fullPath, function (err) {
                                            if (err) return reject(err);

                                            resolve({
                                                name: fileName,
                                                path: fullPath
                                            });
                                        });

                                    })
                                })


                        },
                        /**
                         *
                         * @param options.file required
                         *
                         *
                         * @param options.size string optional
                         * ex: small, large
                         *
                         * @param options.effect function optional
                         * ex:
                         * function (img){
                         *      return img
                         *          .quality(60)                 // set JPEG quality
                         *          .greyscale()                 // set greyscale
                         * }
                         *
                         * @param options.resizeMode string optional
                         * values: normal || fillBlur || fillColor
                         * default : factory config
                         *
                         * @param config.resizeBg number optional
                         * default: factory config color
                         *
                         * @return promise
                         * {
                         *      mime,
                         *      path,
                         *      contentType
                         * }
                         */
                        sender: function (options) {
                            options = options || {}
                            if (typeof options === 'string' || options instanceof String) {
                                options = {
                                    file: options
                                }
                            }


                            var resolveName = (function (file) {
                                if (_.isFunction(file)) return Promise.try(file)
                                return Promise.resolve(file)
                            })(options.file);

                            return resolveName
                                .then(function (srcName) {
                                    srcName = srcName.toString();

                                    var size;
                                    var disFile = (function (src) {

                                        size = resolutions && options.size && resolutions.lockup(options.size);
                                        if (size) return path.join(dir, options.size, src);
                                        return path.join(dir, src);
                                    })(srcName);


                                    if (fs.existsSync(disFile)) {

                                        return {
                                            mime: mime.lookup(disFile),
                                            path: disFile,
                                            contentType: mime.contentType(path.extname(disFile))
                                        }
                                    }

                                    return Jimp.read(path.join(dir, srcName))
                                        .then(function (img) {
                                            if (resolutions && options.size) {
                                                var size = resolutions.lockup(options.size);
                                                if (size) {
                                                    var oW = img.bitmap.width; // the width of the image
                                                    var oH = img.bitmap.height // the height of the image

                                                    var d;

                                                    if (oW > oH) {
                                                        d = size.w / oW;
                                                    } else {
                                                        d = size.h / oH;
                                                    }

                                                    var nW = oW, nH = oH;

                                                    if (d < 1) {
                                                        nW = Math.floor(oW * d);
                                                        nH = Math.floor(oH * d);
                                                    }

                                                    var resizeMode = options.resizeMode || config.resizeMode;
                                                    if (resizeMode === 'normal') {

                                                        if (d < 1) {
                                                            img.rgba(true);
                                                            img.resize(nW, nH);
                                                            //var bg = options.resizeBg || config.resizeBg;
                                                            //return new Jimp(nW, nH, bg, function (err, image) {
                                                            //    img.resize(nW, nH);
                                                            //    image.composite(img, 0, 0);
                                                            //});
                                                        }


                                                        return img
                                                    }

                                                    if (resizeMode === 'fillColor') {
                                                        var bg = options.resizeBg || config.resizeBg;
                                                        return new Jimp(size.w, size.h, bg, function (err, image) {
                                                            //image.rgba(true);
                                                            var x = (size.w - nW) / 2;
                                                            var y = (size.h - nH) / 2;

                                                            img.resize(nW, nH);
                                                            image.composite(img, x, y);
                                                        });
                                                    }

                                                    if (resizeMode === 'fillBlur') {
                                                        var bg = options.resizeBg || config.resizeBg;
                                                        return new Jimp(size.w, size.h, bg, function (err, image) {
                                                            //
                                                            var x = (size.w - nW) / 2;
                                                            var y = (size.h - nH) / 2;

                                                            var oImg = img.clone();
                                                            oImg.resize(size.w, size.h);

                                                            img.resize(nW, nH);

                                                            image.composite(oImg, 0, 0);
                                                            image.blur(5);
                                                            image.composite(img, x, y);
                                                        });
                                                    }

                                                    throw 'not supported resizeMode';
                                                }
                                            }
                                            return img;
                                        })

                                        .then(function (img) {
                                            if (options.effect) {
                                                var r = options.effect(img);
                                                return Promise.resolve(r)
                                                    .then(function () {
                                                        return img;
                                                    })
                                            }

                                            return img;
                                        })
                                        .then(function (img) {
                                            return new Promise(function (resolve, reject) {
                                                img.write(disFile, function (err, result) {
                                                    if (err) return reject(err)
                                                    resolve(result);
                                                });
                                            })
                                        })
                                        .then(function () {
                                            return {
                                                mime: mime.lookup(disFile),
                                                path: disFile,
                                                contentType: mime.contentType(path.extname(disFile))
                                            }
                                        })


                                })

                        },
                        clear: function (file) {

                            if (resolutions === false)
                                return Promise.resolve()

                            var resolveName = (function (file) {
                                if (_.isFunction(file)) return Promise.try(file)
                                return Promise.resolve(file)
                            })(file);

                            return resolveName
                                .then(function (name) {
                                    name = name.toString();

                                    var actions = [];

                                    resolutions.sizeNames.forEach(function (size) {
                                        var p = path.join(dir, size, name);

                                        actions.push((function (p) {
                                            return new Promise(function (resolve) {
                                                fs.unlink(p, function (err) {
                                                    err && console.log(err)
                                                    err && err.stack && console.log(err.stack)
                                                    resolve()
                                                })
                                            })
                                        })(p));
                                    })

                                    return Promise.all(actions)
                                })
                        },
                        delete: function (file) {
                            var resolveName = (function (file) {
                                if (_.isFunction(file)) return Promise.try(file)
                                return Promise.resolve(file)
                            })(file);


                            return resolveName
                                .then(function (name) {
                                    var fullPath = path.join(dir, name);

                                    return new Promise(function (resolve) {
                                        fs.unlink(fullPath, function (err) {
                                            err && console.log(err)
                                            err && err.stack && console.log(err.stack)
                                            resolve()
                                        })
                                    })
                                })
                        }
                    }
                },
                uploader: uploader,
                tempFile: function (tempName) {
                    return path.join(configure.tempDir, tempName);
                }
            }
        }
    ])
