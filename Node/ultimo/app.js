/*-----------------------------------------------------------------------------
 This Bot is a sample calling bot for Skype.  It's designed to showcase whats
 possible on Skype using the BotBuilder SDK. The demo shows how to create a
 looping menu, recognize speech & DTMF, record messages, play multiple prompts,
 and even send a caller a chat message.

 # RUN THE BOT:

 You can run the bot locally using ngrok found at https://ngrok.com/.

 * Install and run ngrok in a console window using "ngrok http 3978".
 * Create a bot on https://dev.botframework.com and follow the steps to setup
 a Skype channel. Ensure that you enable calling support for your bots skype
 channel.
 * For the messaging endpoint in the Details for your Bot at dev.botframework.com,
 ensure you enter the https link from ngrok setup and set
 "<ngrok link>/api/messages" as your bots calling endpoint.
 * For the calling endpoint you setup on dev.botframework.com, copy the https
 link from ngrok setup and set "<ngrok link>/api/calls" as your bots calling
 endpoint.
 * Next you need to configure your bots CALLBACK_URL, MICROSOFT_APP_ID, and
 MICROSOFT_APP_PASSWORD environment variables. If you're running VSCode you
 can add these variables to your the bots launch.json file. If you're not
 using VSCode you'll need to setup these variables in a console window.
 - CALLBACK_URL: This should be the same endpoint you set as your calling
 endpoint in the developer portal.
 - MICROSOFT_APP_ID: This is the App ID assigned when you created your bot.
 - MICROSOFT_APP_PASSWORD: This was also assigned when you created your bot.
 * To use the bot you'll need to click the join link in the portal which will
 add it as a contact to your skype account. When you click on the bot in
 your skype client you should see an option to call your bot. If you're
 adding calling to an existing bot can take up to 24 hours for the calling
 option to show up.
 * You can run the bot by launching it from VSCode or running "node app.js"
 from a console window.  Then call your bot from a skype client to start
 the demo.

 -----------------------------------------------------------------------------*/

var fs = require('fs');
var process = require("process");
var restify = require('restify');
var builder = require('../core/');
var calling = require('../calling/');
var prompts = require('./prompts');
var keys = require('./keys');
var repliers = require('./repliers');

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
        session.send(repliers.generateReply(lastDump));


        // if (state != "present") {
        //     session.replaceDialog('/replying');
        // }
        // else {
        //     session.send(generateReply(lastDump));
        // }
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
        calling.Prompts.record(session, prompts.record.intro, {
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
            fs.writeFile(filename, data, function(err) {
                if(err) {return console.log(err);}
                console.log("The file " + filename + " was saved!");
            });
            lastDump = data;
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
