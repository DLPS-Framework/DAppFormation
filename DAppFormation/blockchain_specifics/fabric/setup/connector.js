/*
 * Copyright 2019  ChainLab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
SPDX-License-Identifier: Apache-2.0
*/

/*
 * Commi
 */

'use strict';

const config = require("./config.json");
const channel = config.channel;
const channel_count = config.channel_count;

// Bring key classes into scope, most importantly Fabric SDK network class
const fs = require('fs');
const yaml = require('js-yaml');
const { FileSystemWallet, Gateway } = require('fabric-network');
let contracts = [];
let networks = [];
// A gateway defines the peers used to access Fabric networks
const gateway = new Gateway();

// A wallet stores a collection of identities for use
//const wallet = new FileSystemWallet('../user/isabella/wallet');
const wallet = new FileSystemWallet(__dirname + '/wallet');

async function init(userName) {

  try {

    // Load connection profile; will be used to locate a gateway
    //let connectionProfile = yaml.safeLoad(fs.readFileSync(__dirname+'/../gateway/networkConnection.yaml', 'utf8'));
    const ccpFile = fs.readFileSync(__dirname + '/network.json');
    const ccp = JSON.parse(ccpFile.toString());

    // Set connection options; identity and wallet
    let connectionOptions = {
      identity: userName,
      wallet: wallet,
      discovery: { enabled: false, asLocalhost: false },
      "grpc.max_receive_message_length": -1,
      "grpc.max_send_message_length": -1,
      "grpc.keepalive_time_ms": 3000,
      "grpc.http2.min_time_between_pings_ms": 3000,
      "grpc.keepalive_timeout_ms": 3000,
      "grpc.http2.max_pings_without_data": 0,
      "grpc.keepalive_permit_without_calls": 1
    };

    // Connect to gateway using application specified parameters
    //console.log('Connect to Fabric gateway.');

    await gateway.connect(ccp, connectionOptions);
    try {
      //console.log("Connected to " + JSON.stringify(ccp["channels"][channel]["peers"]))
    } catch (err) {
      console.log(err)
    }

    //await gateway.connect(connectionProfile, connectionOptions);

    // Access PaperNet network
    //console.log('Use network channel: mychannel.');
    for (let channel=0; channel<channel_count; channel++) {
      //console.log("mychannel" + (channel+1))
      let network = await gateway.getNetwork("mychannel" + (channel+1));
      networks.push(network)
    }
    //console.log(networks);

    // Get addressability to commercial paper contract
    //console.log('Use org.tally.tallycontract smart contract.');

    //const contract = await network.getContract('tallycontract', 'org.tally.tallycontract');
    for (let network of networks) {
      let contract = await network.getContract('benchcontract');
      contracts.push(contract)
    };

    //console.log(contracts);

  }
  catch (err) {
    console.log(`Error processing transaction. ${err}`);
    console.log(err.stack);
    return (err.message)
  }
}

// Main program function
async function main(args, method) {
  //console.log(contracts);
  // Main try/catch block
  try {
    let n = Math.floor(Math.random() * contracts.length);
    console.log(n);
    if (method == "submit") {
      var issueResponse = await contracts[n].submitTransaction.apply(contracts[n], args).catch(err => { return Promise.reject(err) })
    }
    else if (method == "query") {
      var issueResponse = await contracts[n].evaluateTransaction.apply(contracts[n], args).catch(err => { return Promise.reject(err) })
    }


    // process response
    //console.log('Process issue transaction response.');
    let buffer = Buffer.from(JSON.parse(issueResponse))
    let jsonResponse = buffer.toString()
    //console.log('Transaction complete.');
    //console.log(jsonResponse)
    return jsonResponse

  } catch (error) {
    console.log(`Error processing transaction. ${error}`);
    console.log(error.stack);
    //return (error.message)
    return Promise.reject(error)
  }
}

async function query(args) {
  return main(args, 'query')
}

async function submit(args) {
  return main(args, 'submit')
}

async function disconnect() {
  gateway.disconnect();
}


module.exports = {
  query: query,
  submit: submit,
  init: init,
  disconnect: disconnect
};
