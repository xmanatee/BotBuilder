/**
 * Created by manatee on 27.11.16.
 */

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


var lda = require('lda');
var keys = require('./keys');
var unirest = require('unirest');
var fs = require('fs');
var Promise = require('bluebird');

var text = "Cats are samll.";

var documents = text.match( /[^\.!\?]+[\.!\?]+/g );

var result = lda(documents, 2, 5);

console.log(result);

var result_dict = get_text_dict(result);

console.log(result_dict);


var result_url = unirest.post("https://wordcloudservice.p.mashape.com/generate_wc").header("X-Mashape-Key", keys.MASHAPE_KEY).header("Content-Type", "application/json").header("Accept", "application/json").send({
        "f_type": "png", "width": 800, "height": 500, "s_max": "7", "s_min": "1", "f_min": 1,
        "r_color": "TRUE", "r_order": "TRUE", "s_fit": "FALSE", "fixed_asp": "TRUE",
        "rotate": "TRUE", "textblock": result_dict[0]
    }).end(function (result) {
        return result;
    });

