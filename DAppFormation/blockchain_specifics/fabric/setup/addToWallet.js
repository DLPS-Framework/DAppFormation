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
 *  SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Bring key classes into scope, most importantly Fabric SDK network class
const fs = require('fs');
const { FileSystemWallet, X509WalletMixin } = require('fabric-network');
const path = require('path');

const config = require("./config.json");
const userName = config.userName;
const keyName = config.keyName;
const MSPName = config.MSPName;

const fixtures = path.resolve(__dirname);

// A wallet stores a collection of identities
const wallet = new FileSystemWallet('./wallet/');

async function main() {

    // Main try/catch block
    try {

        // Identity to credentials to be stored in the wallet
        const credPath = path.join(fixtures, '/creds/' + userName);
        const cert = fs.readFileSync(path.join(credPath, '/msp/signcerts/' + userName + '-cert.pem')).toString();
        const key = fs.readFileSync(path.join(credPath, '/msp/keystore/' + keyName)).toString();

        // Load credentials into wallet
        const identityLabel = userName;
        const identity = X509WalletMixin.createIdentity(MSPName, cert, key);

        await wallet.import(identityLabel, identity);

    } catch (error) {
        console.log(`Error adding to wallet. ${error}`);
        console.log(error.stack);
    }
}

main().then(() => {
    console.log('done');
}).catch((e) => {
    console.log(e);
    console.log(e.stack);
    process.exit(-1);
});
