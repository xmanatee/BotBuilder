var fs = require('fs');
var process = require("process");
var restify = require('restify');

var builder = require('Node/core/');
var calling = require('Node/calling/');

var prompts = require('./prompts');
var keys = require('./keys');
var intelligence = require('./intelligence');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});


var chatConnector = new builder.ChatConnector({
    appId: keys.MICROSOFT_APP_ID,
    appPassword: keys.MICROSOFT_APP_PASSWORD
});
var chatBot = new builder.UniversalBot(chatConnector);
server.post('/api/messages', chatConnector.listen());


var connector = new calling.CallConnector({
    callbackUrl: keys.CALLBACK_URL,
    appId: keys.MICROSOFT_APP_ID,
    appPassword: keys.MICROSOFT_APP_PASSWORD
});
var bot = new calling.UniversalCallBot(connector);
server.post('/api/calls', connector.listen());

var state = "not-present";
var lastDump;
var lastDumpFileName;

chatBot.dialog('/', [
    function (session) {
        session.beginDialog('/replying');
    },
    function (session) {
        session.send(prompts.goodbye);
    }
]);

chatBot.dialog('/replying', [
    function (session) {
        while (state != "present") {}
        intelligence.speech2Text(lastDumpFileName).then((textFileName) => {

            var content = fs.readFileSync(textFileName, 'utf8');

            session.send(content);

            intelligence.generatePNG(textFileName, function (pngUrl) {
                var pngMessage = new builder.Message(session)
                    .attachments([{
                        contentType: "image/png",
                        contentUrl: pngUrl
                    }]);
                session.send(pngMessage);
            });

            intelligence.generateSummary(textFileName, function (mes) {
                session.send(mes);
            });
        });
    }
]);


bot.dialog('/',
    function (session) {
        session.send(prompts.welcome);
        session.beginDialog('/menuRecord');
    },
    function (session, results) {
        session.send(prompts.goodbye);
    }
);

bot.dialog('/menuRecord', [
    function (session) {
        calling.Prompts.record(session, prompts.record, {
            playBeep: true,
            recordingFormat: 'wav',
            maxDurationInSeconds: 500,
            maxSilenceTimeoutInSeconds: 3});
    },
    function (session, results) {
        if (results.response) {
            var data = results.response.recordedAudio;
            var date = new Date();
            var filename = session.userData.id
                + '_' + date.getDay()
                + '_' + date.getHours()
                + '_' + date.getMinutes() + '.wav';
            fs.writeFile('records/' + filename, data, function(err) {
                if(err) {return console.log(err);}
            });
            lastDump = data;
            lastDumpFileName = filename;
            state = "present";
        } else {
            session.endDialog(prompts.canceled);
        }
    }
]);
