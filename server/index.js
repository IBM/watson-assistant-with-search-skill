/**
 * Copyright 2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';

require('dotenv').config({
  silent: true
});

require('isomorphic-fetch');
const messageBuilder = require('./message-builder');
const assistant = require('./watson-assistant-service');

/**
 * Back end server which handles initializing the Watson Assistant
 * service, and setting up route methods to handle client requests.
 */
const WatsonAssistantService = new Promise((resolve) => {
  assistant.createSession({ assistantId: assistant.assistantId })
    .then(res => {
      console.log('Create Session result: ' + JSON.stringify(res.result, null, 2));
      messageBuilder.setAssistantId(assistant.assistantId);
      messageBuilder.setSessionId(res.result.session_id);
      resolve(createServer());
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log('Error creating session:');
      console.error(error);
    });
});

/**
 * createServer - create express server and handle requests
 * from client.
 */
function createServer() {
  const server = require('./express');

  // Endpoint for Watson Assistant requests
  server.post('/api/message', function(req, res) {
    // build message
    const params = {};
    params.context = req.body.context;
    params.input = {
      text: req.body.message
    };
    const messageParams = messageBuilder.message(params);
    // Send the input to the conversation service
    assistant.message(messageParams, function(err, data) {
      if (err) {
        console.log('ERROR! ' + err.code);
        return res.status(err.code || 500).json(err);
      }
      return res.json(updateMessage(data));
    });
  });

  /**
   * Updates the response text using the intent confidence
   * @param  {Object} response The response from the Assistant service
   * @return {Object}          The response with the updated message
   */
  function updateMessage(response) {
    let responseText = null;
    if (!response.result.output) {
      response.result.output = {};
    } else {
      return response;
    }
    if (response.result.output.intents && response.result.output.intents[0]) {
      const intent = response.result.output.intents[0];
      // Depending on the confidence of the response the app can return different messages.
      // The confidence will vary depending on how well the system is trained. The service will always try to assign
      // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
      // user's intent . In these cases it is usually best to return a disambiguation message
      // ('I did not understand your intent, please rephrase your question', etc..)
      if (intent.confidence >= 0.75) {
        responseText = 'I understood your intent was ' + intent.intent;
      } else if (intent.confidence >= 0.5) {
        responseText = 'I think your intent was ' + intent.intent;
      } else {
        responseText = 'I did not understand your intent';
      }
    }
    response.result.output.text = responseText;
    return response;
  }

  // initial start-up request
  server.get('/*', function(req, res) {
    console.log('In startup!');

    // render chatbot welcome message
    res.render('index', {});
  });

  return server;
}

module.exports = WatsonAssistantService;
