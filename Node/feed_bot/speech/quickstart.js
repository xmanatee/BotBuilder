/**
 * Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// [START speech_quickstart]
// Imports the Google Cloud client library
const Speech = require('@google-cloud/speech');
var fs = require('fs');
// Your Google Cloud Platform project ID
const projectId = 'api-project-1051635408023';

// Instantiates a client
const speechClient = Speech({
    projectId: projectId
});

// The name of the audio file to transcribe
//const fileName = './resources/test.wav';
const fileName = './resources/audio2.raw';

// The audio file's encoding and sample rate
const options = {
    encoding: 'LINEAR16',
    sampleRate: 16000
};

// Detects speech in the audio file
speechClient.recognize(fileName, options)
    .then((results) => {
        const transcription = results[0];
        //console.log(`Transcription: ${transcription}`);
        fs.appendFile('Outoutfile.txt', transcription + '. ', function (err) {});
    });
// [END speech_quickstart]
