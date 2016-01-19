var assert = require('assert');
var Foduler = require('../foduler');

describe('foduler', function () {
    var foduler;
    beforeEach(function () {
        foduler = Foduler.factory('test');
    });


    it('one module -> a+b', function (done) {
        var ModuleA = foduler.module('ModuleA').as('a')
            .factory('a', function () {
                return 5;
            })
            .factory('b', function () {
                return 3;
            })
            .factory('a+b', ['a', 'b',
                function (a, b) {
                    return a + b;
                }
            ])
            .run(['a+b', function (r) {
                assert.equal(r, 8);
                setTimeout(done, 10);
            }]);


        foduler.start(ModuleA);
    });

    it('two module -> a+b', function (done) {
        var ModuleB = foduler.module('ModuleB').as('b')
            .factory('a', function () {
                return 9;
            });

        var ModuleA = foduler.module('ModuleA').as('a')
            .include(ModuleB)
            .include(ModuleB)
            .include(ModuleB)
            .factory('a', function () {
                return 5;
            })

            .run(['a', 'b:a', function (a, b) {
                assert.equal(14, a + b);
                setTimeout(done, 10);
            }]);


        foduler.start(ModuleA);
    });

    it('values test', function (done) {
        var ModuleB = foduler.module('ModuleB').as('b')
            .value('a', 3);

        var ModuleA = foduler.module('ModuleA').as('a')
            .include(ModuleB)
            .factory('v', function () {
                return 4;
            })
            .factory('a', function () {
                return 5;
            })

            .run(['a', 'v', 'b:a', function (a, v, b) {
                assert.equal(12, a + b + v);
                setTimeout(done, 10);
            }]);


        foduler.start(ModuleA);
    });

    it('config test', function (done) {
        var c1, c2, c3;
        var ModuleB = foduler.module('ModuleB').as('b')
            .value('a', 3)
            .factory('a1', ['a',
                function (a) {
                    return a + 8;
                }
            ])
            .config(['a',
                function (a) {
                    c2 = a + 4;
                }
            ])
            .config(function () {
                c1 = 1;
            });

        var ModuleA = foduler.module('ModuleA').as('a')
            .include(ModuleB)
            .config(['b:a1',
                function (ba) {
                    c3 = ba + 1;
                }
            ])
            .run(function () {
                assert.equal(c1, 1);
                assert.equal(c2, 7);
                assert.equal(c3, 12);
                setTimeout(done, 10);
            });


        foduler.start(ModuleA);
    });

    it('event test', function (done) {
        var c,c2;
        var ModuleA = foduler.module('Ma')
            .value('a', 3)
            .factory('a1', ['a',
                function (a) {
                    return a + 8;
                }
            ])
            .config(['a1',
                function (a) {
                    c = a + 4;
                }
            ])
            .on('kk', function () {

            })

            .on('postRun',['a1',
                function (a1) {
                    assert.equal(a1, 11);
                    assert.equal(c, 15);
                    setTimeout(function () {
                        assert.equal(c2, 5);
                        setTimeout(done, 5);
                    },200);
                }
            ])
            .on('postRun', function () {
                c2 = 5;
            });



        foduler.start(ModuleA);
    });
});