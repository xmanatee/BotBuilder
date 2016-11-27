var lda = require('lda');
var keys = require('./keys');
var unirest = require('unirest');
var fs = require('fs');

var get_text_dict = function(result) {
    var temp_dict = {};
    var final_dict = {};
    var words = [];
    var word_probs = [];
    for (var i in result) {
        var row = result[i];
        var fin_array = [];
        temp_dict[i] = {};
        temp_dict[i]["words"] = [];
        temp_dict[i]["probs"] = [];
        // For each term.
        for (var j in row) {
            var term = row[j];
            words.push(term.term);
            word_probs.push(term.probability);
        }
        temp_dict[i]["words"] = words;
        temp_dict[i]["probs"] = word_probs;
        fin_array = [];
        var min_div = Math.min.apply(null, temp_dict[i]["probs"]);
        var x = temp_dict[i]["probs"].map( function(item) { return Math.round(item / min_div);});
        for (k = 0; k < x.length; k++) {
            for (j = 0; j < x[k]; j++) {
                fin_array.push(temp_dict[i]["words"][k]);
            }
        }
        final_dict[i] = fin_array.join(" ");
        words = [];
        word_probs = [];
    }
    return final_dict
};

var result = [];

module.exports = {
    speech2Text: function(fileName) {

        const Speech = require('@google-cloud/speech');
        const projectId = keys.GOOGLE_API_PROJECT_ID;

        const speechClient = Speech({
            projectId: projectId
        });

        const options = {
            encoding: 'LINEAR16',
            sampleRate: 16000
        };


        speechClient.recognize("records/" + fileName, options)
            .then((results) => {
                const transcription = results[0];
                fs.appendFile("records/" + fileName + '.txt',
                    transcription + '. ',
                    function (err) {});
            });
        return "records/" + fileName + '.txt';
    },

    generatePNG: function (textFile) {
        var content = fs.readFileSync(textFile, 'utf8');
        var documents = content.match(/[^\.!\?]+[\.!\?]+/g);
        var result = lda(documents, 2, 5);
        var result_dict = get_text_dict(result);
        var result_url = unirest.post("https://wordcloudservice.p.mashape.com/generate_wc")
            .header("X-Mashape-Key", keys.MASHAPE_KEY)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .send({
                "f_type": "png", "width": 800, "height": 500, "s_max": "7", "s_min": "1", "f_min": 1,
                "r_color": "TRUE", "r_order": "TRUE", "s_fit": "FALSE", "fixed_asp": "TRUE",
                "rotate": "TRUE", "textblock": result_dict[0]
            })
            .end(function (result) {
                return result;
            });
        return result.response.raw_body.url;
    },
    generateSummary: function (textFile) {
        var content = fs.readFileSync(textFile, 'utf8');
        var summary;
        unirest.post(keys.CALLBACK_SUMMARY_URL)
            .header("X-Mashape-Key", keys.MASHAPE_KEY)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .send({"Percent": "30", "Language": "en", "Text": content})
            .end(function (result) {
                summary = result.body;
            });
        return summary;
    }
};