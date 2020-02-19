/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
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

import 'isomorphic-fetch';
import React from 'react';
import PropTypes from 'prop-types';
import Messages from './Messages';
import { Grid, Card, Input } from 'semantic-ui-react';

const util = require('util');  

var messageCounter = 1;

/**
 * Main React object that contains all objects on the web page.
 * This object manages all interaction between child objects as
 * well as posting messages to the Watson Assistant service.
 */
class Main extends React.Component {
  constructor(...props) {
    super(...props);
    const { 
      error,
    } = this.props;

    // change in state fires re-render of components
    this.state = {
      error: error,
      // assistant data
      context: {},
      userInput: '',
      conversation: [
        { id: 1,
          text: 'Welcome to the Ecobee support team chatbot!',
          owner: 'watson'
        }]
    };
  }
  
  /**
   * sendMessage - build the message that will be passed to the 
   * Assistant service.
   */
  sendMessage(text) {
    var { context, conversation } = this.state;
    console.log('context: ' + JSON.stringify(context, null, 2));
    
    this.setState({
      context: context
    });

    // send request
    fetch('/api/message', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        context: context,
        message: text
      })
    }).then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw response;
      }
    }).then(json => {
      console.log('+++ ASSISTANT RESULTS +++' + JSON.stringify(json, null, 2));
      const result = json.result.output.generic[0];

      // returned text from assistant will either be a pre-canned 
      // dialog response, or Discovery Search result
      if (result.response_type === 'text') {
        // normal dialog response from Assistant
        // add to message list
        messageCounter += 1;
        conversation.push({
          id: messageCounter,
          text: result.text,
          owner: 'watson'
        });
      } else if (result.response_type === 'search') {
        console.log('GOT DISCO OUTPUT!');
        // got response from Assistant search skill
        // add a header to our message
        messageCounter += 1;
        conversation.push({
          id: messageCounter,
          text: result.header,
          owner: 'watson'
        });

        // find the result with the highest confidence
        let message;
        let score = 0;
        for (var i=0; i<result.results.length; i++) {
          if (result.results[i].result_metadata.confidence > score) {
            score = result.results[i].result_metadata.confidence;
            message = result.results[i].body;
          }
        }
        if (result.results.length > 0) {
          messageCounter += 1;
          conversation.push({
            id: messageCounter,
            text: message,
            owner: 'watson'
          });
        } 
      } else {
        messageCounter += 1;
        conversation.push({
          id: messageCounter,
          text: 'Sorry. Please repeat your question',
          owner: 'watson'
        });
      }

      this.setState({
        conversation: conversation,
        context: json.context,
        error: null,
        userInput: ''
      });
      scrollToMain();

    }).catch(response => {
      console.log('ERROR in fetch: ' + JSON.stringify(response, null, 2));
      this.setState({
        error: 'Error in assistant'
      });
      // eslint-disable-next-line no-console
      console.error(response);
    });
  }

  /**
   * Log Watson Assistant context values, so we can follow along with its logic. 
   */
  printContext(context) {
    if (context.system) {
      if (context.system.dialog_stack) {
        console.log('Dialog Stack:');
        console.log(util.inspect(context, false, null));
      }
    }
  }
  
  /**
   * Display each key stroke in the UI. 
   */
  handleOnChange(event) {
    this.setState({userInput: event.target.value});
  }

  /**
   * Send user message to Assistant. 
   */
  handleKeyPress(event) {
    const { userInput, conversation } = this.state;

    if (event.key === 'Enter') {
      messageCounter += 1;
      conversation.push(
        { id: messageCounter,
          text: userInput,
          owner: 'user'
        }
      );

      console.log('handleKeyPress1');
      this.sendMessage(userInput);
      console.log('handleKeyPress2');
      this.setState({
        conversation: conversation,
        // clear out input field
        userInput: ''
      });

    }
  }

  /**
   * Get list of conversation message to display. 
   */
  getListItems() {
    const { conversation } = this.state;

    return (
      <Messages
        messages={conversation}
      />
    );
  }

  /**
   * render - return all the home page objects to be rendered.
   */
  render() {
    const { userInput } = this.state;

    return (
      <Grid celled className='search-grid'>

        <Grid.Row className='matches-grid-row'>
          <Grid.Column width={16}>

            <Card className='chatbot-container'>
              <Card.Content className='dialog-header'>
                <Card.Header>Document Search ChatBot</Card.Header>
              </Card.Content>
              <Card.Content>
                {this.getListItems()}
              </Card.Content>
              <Input
                icon='compose'
                iconPosition='left'
                value={userInput}
                placeholder='Enter response......'
                onKeyPress={this.handleKeyPress.bind(this)}
                onChange={this.handleOnChange.bind(this)}
              />
            </Card>

          </Grid.Column>
        </Grid.Row>

      </Grid>
    );
  }
}

/**
 * scrollToMain - scroll window to show 'main' rendered object.
 */
function scrollToMain() {
  setTimeout(() => {
    const scrollY = document.querySelector('main').getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, scrollY);
  }, 0);
}

// type check to ensure we are called correctly
Main.propTypes = {
  context: PropTypes.object,
  userInput: PropTypes.string,
  conversation: PropTypes.array,
  error: PropTypes.object
};

module.exports = Main;
