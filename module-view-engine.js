var foduler = require('./foduler1');
var fs = require('fs');
var path = require('path');


module.exports = foduler.module('module:view-engine')
    .factory('swig', function () {
        return require('swig');
    })
    .factory('swig multiLoader', function () {
        return function (basepaths, encoding) {
            var ret = {},roots=[];

            encoding = encoding || 'utf8';

            if(Array.isArray(basepaths)) {
                roots = basepaths;
            }

            function getRoots(){
                if(roots.length == 0) {
                    roots.push(process.cwd());
                }
                return roots;
            }


            ret.resolve = function (to, from) {

                var roots = getRoots();

                if(from){
                    var p = path.resolve(from, to);

                    var stats =fs.statSync(p);
                    if(stats.isFile()) return p;
                }

                for(var k in roots){
                    it = roots[k];
                    var p = path.resolve(it, to);
                    var stats =fs.statSync(p);
                    if(stats && stats.isFile()) return p;
                }

                throw new Error('cannot resolve :' + to + ' in dirs '+roots.join(', ') );
            };

            ret.addPath = function (newPath) {
                roots.push(newPath);
            }


            ret.load = function (identifier, cb) {
                if (!fs || (cb && !fs.readFile) || !fs.readFileSync) {
                    throw new Error('Unable to find file ' + identifier + ' because there is no filesystem to read from.');
                }

                identifier = ret.resolve(identifier);

                if (cb) {
                    fs.readFile(identifier, encoding, cb);
                    return;
                }
                return fs.readFileSync(identifier, encoding);
            };

            return ret;
        };
    })
    .factory('view engine', ['swig',
        function (swig) {
            var paths = [];
            return {
                apply: function (app, options) {
                    options = options || {}
                    app.engine('html', swig.renderFile);
                    app.set('view engine', 'html');
                    app.set('views', paths);
                    app.set('view cache', options.cache || false);

                    swig.setDefaults({cache: options.cache || false});
                    swig.setDefaults({
                        varControls: options.varControls || ['[{', '}]'],
                        tagControls: options.varControls || ['[%', '%]'],
                        cmtControls: options.varControls || ['[#', '#]']
                    });

                    if (options.loadPath){
                        console.log('options.loadPath',options.loadPath)
                        swig.setDefaults({loader: swig.loaders.fs(options.loadPath)});
                    }


                    function dirName(input) {
                        return __dirname
                    }

                    swig.setFilter('dirName', dirName);
                },
                addPath: function (path) {
                    paths.push(path);
                },
                getPaths: function () {
                    return paths;
                },
                setPaths: function (pts) {
                    paths = pts;
                }
            }
        }
    ])







