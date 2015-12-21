var foduler = require('./foduler1');

var crypto = require('crypto')
var base64 = require('base64-url');

var request = require('request');


module.exports = foduler.module('f:userly sdk')

    .factory('f:userly api:reader', ['Promise',
        function (Promise) {
            return function (url) {
                return new Promise(function (resolve, reject) {
                    request(url, function (error, response, body) {
                        if (error) return reject(error);
                        try {
                            var resp = JSON.parse(body);
                            resolve(resp);
                        } catch (e) {
                            reject(e)
                        }
                    })
                })
            }
        }
    ])
    .factory('f:userly decrypt', ['Promise',
        function (Promise) {
            var algorithm = 'aes-256-ctr';

            function decrypt(text, pass) {

                var decipher = crypto.createDecipher(algorithm, pass)
                var dec = decipher.update(text, 'hex', 'utf8')
                dec += decipher.final('utf8');
                return dec;
            }

            return function (text, pass) {


                try {
                    text = base64.decode('' + text);
                    text = decrypt(text, pass);
                    return JSON.parse(text);
                }
                catch (e) {
                    console.log(e)
                    return false;
                }
            }
        }
    ])
    .factory('f:userly configure', [
        function () {
            var options = {
                domain: 'userly.mn',
                scheme: 'http',
            }
            return {
                get domain() {
                    return options.domain;
                },
                get schema() {
                    return options.scheme;
                }
            }
        }
    ])
    .factory('f:userly factory', ['f:userly configure', 'f:userly decrypt', 'f:userly api:reader', 'Promise',
        function (configure, decrypt, reader, Promise) {
            return function (options) {
                var self,
                    appId = options && options.appId,
                    secret = options && options.secret;

                if (!appId) throw new Error('not found userly appId');
                if (!secret) throw new Error('not found userly secret code');

                return self = {
                    loginUrl: function (returnUrl) {
                        var url = '{schema}://login.{domain}/{appId}?return={returnUrl}'.format({
                            schema: configure.schema,
                            domain: configure.domain,
                            appId: appId,
                            returnUrl: returnUrl
                        });
                        return url;
                    },
                    login: function (token) {
                        return Promise.try(function () {
                            if (!token) throw  "token is null";

                            var tokenObj = decrypt(token, secret);

                            if (tokenObj === false) throw  "cannot parse tokenObj";

                            return {
                                time: tokenObj.time,
                                accessToken: tokenObj.accesstoken
                            }
                        })
                    },
                    api: {
                        info: function (accessToken) {
                            return Promise.try(function () {
                                if (!accessToken) throw 'accessToken is null';
                                var url = '{schema}://login.{domain}/api/info/{token}'.format({
                                    schema: configure.schema,
                                    domain: configure.domain,
                                    token: accessToken
                                });

                                return reader(url)
                            })
                        }
                    }

                }
            }
        }
    ])


