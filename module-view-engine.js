var foduler = require('./foduler1');


module.exports = foduler.module('module:view-engine')
    .factory('swig', function () {
        return require('swig');
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







