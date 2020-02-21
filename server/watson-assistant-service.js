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

const AssistantV2 = require('ibm-watson/assistant/v2');
const { getAuthenticatorFromEnvironment } = require('ibm-watson/auth');

// need to manually set url and disableSslVerification to get around
// current Cloud Pak for Data SDK issue IF user uses
// `CONVERSATION_` prefix in run-time environment.
let auth;
let url;
let disableSSL = false;

try {
  // ASSISTANT should be used
  auth = getAuthenticatorFromEnvironment('ASSISTANT');
  url = process.env.ASSISTANT_URL;
  if (process.env.ASSISTANT_DISABLE_SSL == 'true') {
    disableSSL = true;
  }
} catch (e) {
  // but handle if alternate CONVERSATION is used
  auth = getAuthenticatorFromEnvironment('CONVERSATION');
  url = process.env.CONVERSATION_URL;
  if (process.env.CONVERSATION_DISABLE_SSL == 'true') {
    disableSSL = true;
  }
}
console.log('Assistant auth:', JSON.stringify(auth, null, 2));

const assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: auth,
  url: url,
  disableSslVerification: disableSSL
});

assistant.assistantId = process.env.ASSISTANT_ID;
assistant.workspaceId = process.env.WORKSPACE_ID;

module.exports = assistant;
