var fs = require('fs');
var process = require("process");
var restify = require('restify');
var builder = require('../core/');
var calling = require('../calling/');
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

// ##############################


var state = "not-present";
var lastDump;
var lastDumpFileName;

chatBot.dialog('/', [
    function (session) {
        session.send("aka");
        session.beginDialog('/replying');
    },
    function (session) {
        console.log("Stopping the bot.");
        session.send(prompts.goodbye);
    }
]);

chatBot.dialog('/replying', [
    function (session) {
        while (state != "present") {}
        var textFileName = intelligence.speech2Text(lastDumpFileName);
        var pngUrl = intelligence.generatePNG(textFileName);
        var pngMessage = new builder.Message(session)
            .attachments([{
                contentType: "image/png",
                contentUrl: pngUrl
            }]);
        session.send(pngMessage);
        session.send(intelligence.generateSummary(textFileName));
    }
]);


bot.dialog('/',
    function (session) {
        // console.log("CallBot started");
        session.send(prompts.welcome);
        session.beginDialog('/menuRecord');
        // console.log("c");
    },
    function (session, results) {
        session.send(prompts.goodbye);
    }
);

bot.dialog('/menuRecord', [
    function (session) {
        console.log("bfr");
        calling.Prompts.record(session, prompts.record, {
            playBeep: true,
            recordingFormat: 'wav',
            maxDurationInSeconds: 500,
            maxSilenceTimeoutInSeconds: 2});
        console.log("Started Recording");
    },
    function (session, results) {
        if (results.response) {
            console.log("Reason : " + results.resumed);
            var data = results.response.recordedAudio;
            var date = new Date();
            var filename = session.userData.id
                + '_' + date.getDay()
                + '_' + date.getHours()
                + '_' + date.getMinutes() + '.wav';
            fs.writeFile('records/' + filename, data, function(err) {
                if(err) {return console.log(err);}
                console.log("The file " + filename + " was saved!");
            });
            lastDump = data;
            lastDumpFileName = filename;
            state = "present";
        } else {
            console.log("Reason : " + results.resumed);
            session.endDialog(prompts.canceled);
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menuRecord');
    }
]);
