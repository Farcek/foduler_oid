var foduler = require('../foduler1');


module.exports= foduler.module('test2')

    .config(function () {
        console.log('test2 conf')
    })
    .factory('b', function () {
        return 'ok b'
    })
    .run(['b',
        function (b) {
            console.log(b)
        }
    ])


