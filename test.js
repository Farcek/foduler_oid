var foduler = require('./foduler1');


var m = foduler.module('test1')
    .include(require('./test/test2'))
    .config(function () {
        console.log('test1 conf')
    })
    .factory('a', function () {
        console.log(11)
        return 123
    })
    .run(['a',
        function (a) {
            console.log('run ok ' + a)
        }
    ])
    .on('postRun', function () {
        console.log('postRun')
    });

foduler.start(m)