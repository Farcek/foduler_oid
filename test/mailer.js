var foduler = require('../foduler1');
var generator = require('xoauth2').createXOAuth2Generator({
    user: 'farcek@gmail.com',
    clientId: '66590474760-cbebf84faull755dj3icjlhgbfe4hmrr.apps.googleusercontent.com',
    clientSecret: '3og0ikM_vPHNIa0x5ohAa-fy',
    //refreshToken: '{refresh-token}',
    //accessToken: '{cached access token}' // optional
});

var module = foduler.module('test-mailer')
    .include(require('../module-mailer'))
    .config(['fm:mailer configure',
        function (configure) {
            configure.addSmtp({
                host: "smtp.gmail.com", // hostname
                secureConnection: true,
                port: 587, // port for secure SMTP
                //requiresAuth: true,
                //domains: ["gmail.com", "googlemail.com"],
                auth: {
                    user: "farcek@gmail.com",
                    pass: "ftjgvvP099"
                }
            });

            configure.addViewPath(__dirname +'/mailer-tpl' );

            var r = {
                "web": {
                    "client_id": "66590474760-cbebf84faull755dj3icjlhgbfe4hmrr.apps.googleusercontent.com",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://accounts.google.com/o/oauth2/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_secret": ""
                }
            }
        }
    ])
    .config(['fm:mailer mailer',
        function (mailer) {
            //var mailOptions = {
            //    //from: 'Fred Foo ? <foo@blurdybloop.com>', // sender address
            //    to: 'farcek@yahoo.com', // list of receivers
            //    subject: 'Hello ?', // Subject line
            //    text: 'Hello world ?', // plaintext body
            //};
            //mailer.text(mailOptions);


            mailer.html("test.html",{
                ok :'farcek'
            }, {

                to: 'farcek@yahoo.com', // list of receivers
                subject: 'Hello ?', // Subject line

            });

        }
    ])


foduler.start(module)