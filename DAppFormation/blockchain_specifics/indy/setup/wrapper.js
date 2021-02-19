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

    "use strict";

    const indy = require('indy-sdk');
    const assert = require('assert');

    const util = require('./util');
    const config = require("./config.json");
    const poolName = config.pool_name;

    const fs = require('fs');
    const crypto = require('crypto')

    let tailsWriterConfig = {'base_dir': util.getPathToIndyClientHome() + "/tails", 'uri_pattern': ''};

    /**
     * module description
     * @module Bench
     */
    class Bench {

        /**
         * Always launch after instantiating
         */
        async init(worker) {

            var workerString;
            if (typeof worker !== 'undefined') {
                workerString = worker;
            } else {
                workerString = "";
            }
            console.log(`workerString: ${workerString}`);

            this.readMaterial = require(`./readMaterial${worker}.json`);
            //console.log(this.readMaterial);

            try {
                this.poolName = `${poolName}${worker+1}`
                this.poolGenesisTxnPath = await util.getPoolGenesisTxnPath(this.poolName);
                this.poolConfig = {
                    "genesis_txn": this.poolGenesisTxnPath
                };
                try {
                    await indy.createPoolLedgerConfig(this.poolName, this.poolConfig);
                } catch (e) {
                    if (e.message !== "PoolLedgerConfigAlreadyExistsError") {
                        console.log(e);
                        return Promise.reject(-1);
                    }
                }

                await indy.setProtocolVersion(2)

                this.poolHandle = await indy.openPoolLedger(this.poolName);
                console.log(`poolHandle: ${this.poolHandle}`)
                //console.log("Pool ledger successfully opened")

                //Creating a Steward's wallet
                this.stewardWalletConfig = {'id': `stewardWalletName${worker+1}`}
                this.stewardWalletCredentials = {'key': `steward_key${worker+1}`}
                try {
                    await indy.createWallet(this.stewardWalletConfig, this.stewardWalletCredentials)
                } catch (e) {
                    if (e.message !== "WalletAlreadyExistsError") {
                        console.log('Other error');
                        throw e;
                    }
                }

                this.stewardWallet = await indy.openWallet(this.stewardWalletConfig, this.stewardWalletCredentials);
                this.stewardDidInfo = {
                    'seed': '000000000000000000000000Steward' + String(worker+1)
                };

                let [stewardDid, _] = await indy.createAndStoreMyDid(this.stewardWallet, this.stewardDidInfo);
                this.stewardDid = stewardDid;
                console.log(`DID for steward ${worker}: ${this.stewardDid}`)

                console.log("Bench init successful\n\n");
                return Promise.resolve(0);

            } catch (err) {

                console.log("Error during bench init");
                console.log(err);
                console.log(this.stewardWalletConfig);
                console.log(this.stewardWalletCredentials);
                return Promise.reject(err);

            }
        }

        async prepare () {

            for (let i=0; i<10; i++) {
                await this.createWallet();
                await this.writeDID(-1);
                await this.writeSchema(2);
                await this.readSchema(-1);
                await this.writeCredDef(-1);
                await this.readCredDef(-1);
                await this.writeRevRegDef(-1);
                await this.readRevRegDef(-1);
                await this.writeRevRegDeltaAdd(-1);
                await this.writeRevRegDeltaAdd(-1);
                await this.readRevRegDelta(-1);
                await this.writeRevRegDeltaSubtract(-1);
                await this.readRevRegDelta(-1);
            }

        }

        /**
         * Always launch after completion
         */
        async close(worker) {

            var workerString;
            if (typeof worker !== 'undefined') {
                workerString = worker;
            } else {
                workerString = "";
            }
            console.log(`workerString: ${workerString}`);

            try {

                console.log(`Writing read material for workerString: ${workerString}`)
                fs.writeFile(`readMaterial${workerString}.json`, JSON.stringify(this.readMaterial), (err) => {
                    if (err) {
                        console.log(err);
                        throw(err);
                        //return Promise.reject(err);
                    }
                console.log("JSON data is saved.");
                });

                //console.log("Close and Delete wallet");
                await indy.closeWallet(this.stewardWallet);
                await indy.deleteWallet(this.stewardWalletConfig, this.stewardWalletCredentials);

                //console.log("Close and Delete pool");
                await indy.closePoolLedger(this.poolHandle);
                await indy.deletePoolLedgerConfig(this.poolName);

                console.log("Successfully closed pool")
                return Promise.resolve(true)
            }
            catch(err) {
                console.log("Error when closing stuff")
                console.log(err)
                return Promise.reject(err)
            }
        }

        async createWallet() {

            let walletName = "wallet" + Math.floor(Math.random() * 10000000);
            let walletConfig = {'id': walletName}
            let walletCredentials = {'key': "key" + walletName}
            try {
                let start = Date.now();
                await indy.createWallet(walletConfig, walletCredentials);
                this.readMaterial.wallets.push({"walletName": walletName});
                let end = Date.now();
                return Promise.resolve(end-start);
            } catch (e) {
                if (e.message !== "WalletAlreadyExistsError") {
                    console.log("Wallet" + walletName + "already exists")
                    return Promise.resolve(0);
                } else {
                    console.log(e);
                    return Promise.reject(-1);
                }
            }
        }

        async writeDID(n=undefined) {


            var index;
            try{
                if (typeof n !== 'undefined') {
                    if (n < 0) {
                        index = this.readMaterial.wallets.length + n;
                    } else {
                        index = n;
                    }
                } else {
                    index = Math.floor(Math.random() * this.readMaterial.wallets.length);
                }
                console.log(`Wallet index: ${index}`);
                let walletName = this.readMaterial.wallets[index].walletName;
                let walletConfig = {'id': walletName}
                let walletCredentials = {'key': "key" + walletName}

                console.log(`Creating DID for wallet ${walletName}`)

                let didInfo = {
                        'seed': '000000000000000000000000Wallet' + Math.floor(Math.random() * 1000000000).toString()
                    };
                didInfo.seed = crypto.createHash('md5').update(didInfo.seed).digest('hex')
                let wallet = await indy.openWallet(walletConfig, walletCredentials);
                let [did, verkey] = await indy.createAndStoreMyDid(wallet, didInfo);
                await indy.closeWallet(wallet);

                let nymRequest = await indy.buildNymRequest(this.stewardDid, did, verkey, null, "TRUST_ANCHOR");

                let start = Date.now()
                let nymResponse = await indy.signAndSubmitRequest(this.poolHandle, this.stewardWallet, this.stewardDid, nymRequest);
                //console.log(JSON.stringify(nymResponse))
                let end = Date.now()

                if (nymResponse.op == "REPLY" && nymResponse.result.txnMetadata.seqNo > 0) {

                    console.log(`Added DID ${did} as trust anchor`)
                    this.readMaterial.dids.push({"walletName": walletName, "did": did, "attribs": []});
                    return Promise.resolve(end - start);

                } else {

                    console.log(nymResponse);
                    return Promise.reject(-1);

                }

            } catch(err) {
                console.log(err);
                try {
                    await indy.closeWallet(wallet);
                } catch (err) {
                    console.log(err);
                    throw (err);
                }
                return Promise.reject(-1);
            };
        }

        async readDID(n = undefined) {

            var index;
            try{
                if (typeof n !== 'undefined') {
                    if (n < 0) {
                        index = this.readMaterial.dids.length + n;
                    } else {
                        index = n;
                    }
                } else {
                    index = Math.floor(Math.random() * this.readMaterial.dids.length);
                }
                console.log(`DID index: ${index}`);

                let did = this.readMaterial.dids[(Math.floor(Math.random() * this.readMaterial.dids.length))].did;
                //console.log(did);
                let getNymRequest = await indy.buildGetNymRequest(this.stewardDid, did).catch(err => console.log(err));
                //console.log(getNymRequest)

                let start = Date.now();
                let getNymResponse = await indy.submitRequest(this.poolHandle, getNymRequest).catch(err => console.log(err));
                let end = Date.now();
                if (getNymResponse.op == "REPLY" && getNymResponse.result.seqNo > 0) {

                    //console.log(JSON.stringify(getNymResponse));
                    console.log(`Read nym info for ${getNymResponse.result.dest}`);
                    return Promise.resolve(end-start);

                } else {

                    console.log(nymResponse);
                    await indy.closeWallet(wallet);
                    return Promise.reject(-1);

                }

            } catch (err) {
                console.log(err);
                try {
                    await indy.closeWallet(wallet);
                } catch (err2) {
                    console.log(err2);
                    throw (err2);
                }
                return Promise.reject(-1);
            }
        }

        async writeAttrib(n=undefined) {

            var index;
            try{
                if (typeof n !== 'undefined') {
                    if (n < 0) {
                        index = this.readMaterial.dids.length + n;
                    } else {
                        index = n;
                    }
                } else {
                    index = Math.floor(Math.random() * this.readMaterial.dids.length);
                }
                console.log(`DID index: ${index}`);
                let walletName = this.readMaterial.dids[index].walletName;
                let did = this.readMaterial.dids[index].did;
                //console.log(`did: ${did}`)
                let walletConfig = {'id': walletName}
                let walletCredentials = {'key': "key" + walletName}

                let key = `key${Math.floor(Math.random() * 10000).toString()}`
                let value = `value${Math.floor(Math.random() * 10000).toString()}`

                let attrib_json = {};
                attrib_json[key] = value;
                console.log(`Writing attribute ${JSON.stringify(attrib_json)} for wallet ${walletName}`)
                //console.log(attrib_json);
                let attribRequest = await indy.buildAttribRequest(did, did, null, attrib_json);
                //console.log(attribRequest);

                let wallet = await indy.openWallet(walletConfig, walletCredentials);
                let start = Date.now()
                let attribResponse = await indy.signAndSubmitRequest(this.poolHandle, wallet, did, attribRequest);
                //console.log(attribResponse)
                await indy.closeWallet(wallet);
                //console.log(JSON.stringify(nymResponse))
                let end = Date.now()

                if (attribResponse.op == "REPLY" && attribResponse.result.txnMetadata.seqNo > 0) {

                    //console.log(`Added attribute ${JSON.stringify({key: value})} to did ${did}`)
                    this.readMaterial.dids[index].attribs.push(key);
                    return Promise.resolve(end - start);

                } else {

                    console.log(attribResponse);
                    return Promise.reject(-1);

                }

            } catch(err) {
                console.log(err);
                try {
                    await indy.closeWallet(wallet);
                } catch (err) {
                    console.log(err);
                    throw (err);
                }
                return Promise.reject(-1);
            };
        }

        async readAttrib(n = undefined) {

            var index;
            try{
                if (typeof n !== 'undefined') {
                    if (n < 0) {
                        index = this.readMaterial.dids.length + n;
                    } else {
                        index = n;
                    }
                } else {
                    index = Math.floor(Math.random() * this.readMaterial.dids.length);
                }
                console.log(`DID index: ${index}`);

                let did = this.readMaterial.dids[index].did;
                //console.log(this.readMaterial.dids[index].attribs)
                //console.log(this.readMaterial.dids[index].attribs.length)
                let key = this.readMaterial.dids[index].attribs[Math.floor(Math.random() * this.readMaterial.dids[index].attribs.length)];
                //console.log("key: " + key);
                console.log(`Reading attribute ${key} for did ${did}`);

                //console.log(did);
                let getAttribRequest = await indy.buildGetAttribRequest(did, did, key).catch(err => console.log(err));
                //console.log(getAttribRequest)

                let start = Date.now();
                let getAttribResponse = await indy.submitRequest(this.poolHandle, getAttribRequest).catch(err => console.log(err));
                //console.log(getAttribResponse);
                let end = Date.now();
                if (getAttribResponse.op == "REPLY" && getAttribResponse.result.seqNo > 0) {

                    //console.log(JSON.stringify(getNymResponse));
                    //console.log(`Read attrib info for ${getAttribResponse.result.dest}`);
                    return Promise.resolve(end-start);

                } else {

                    console.log(attribResponse);
                    return Promise.reject(-1);

                }

            } catch (err) {
                console.log(err);
                try {
                    await indy.closeWallet(wallet);
                } catch (err2) {
                    console.log(err2);
                    throw (err2);
                }
                return Promise.reject(-1);
            }
        }

        async writeSchema(numberOfKeys=2) {

            let rand_nrs = []
            for (let i=0; i<numberOfKeys; i++) {
                rand_nrs.push((Math.floor(Math.random() * 100000000)).toString());
            }

            try {

                let [schemaId, schemaJson] = await indy.issuerCreateSchema(this.stewardDid, 'Transcript' + rand_nrs[0].toString(), '1.0',
                    rand_nrs);

                let schemaRequest = await indy.buildSchemaRequest(this.stewardDid, schemaJson);
                //console.log("Schema request: " + JSON.stringify(schemaRequest))

                let start = Date.now();
                let schemaResponse = await indy.signAndSubmitRequest(this.poolHandle, this.stewardWallet, this.stewardDid, schemaRequest);
                let end = Date.now();
                //console.log("Response: " + JSON.stringify(response))

                if (schemaResponse.op == "REPLY" && schemaResponse.result.txnMetadata.seqNo > 0) {

                    //console.log(schemaResponse);
                    console.log(`Created schema with id ${schemaResponse.result.txnMetadata.txnId}`);
                    this.readMaterial.schemas.push({"schemaId": schemaId});
                    return Promise.resolve(Date.now() - start);

                } else if (response.op == "REQNACK") {

                    console.log(schemaResponse);
                    return Promise.reject('-1')

                } else {

                    console.log("Unexpected response");
                    console.log(schemaResponse);
                    throw ("Unknown error")

                }
            } catch(err) {
                console.log(err);
                try {
                    await indy.closeWallet(wallet);
                } catch (err2) {
                    console.log(err2);
                    throw (err2);
                }
                return Promise.reject(-1);
            }
        }

        // reads a schema from the list of schemas
        async readSchema(n = undefined) {

            var index;
            try{
                if (typeof n !== 'undefined') {
                    if (n < 0) {
                        index = this.readMaterial.schemas.length + n;
                    } else {
                        index = n;
                    }
                } else {
                    index = Math.floor(Math.random() * this.readMaterial.schemas.length);
                }

                console.log(`Schema index: ${index}`);
                let schema = this.readMaterial.schemas[index];
                //console.log(`Schema: ${schema}`);

                let getSchemaRequest = await indy.buildGetSchemaRequest(this.stewardDid, schema.schemaId);
                //console.log(JSON.stringify(getSchemaRequest))


                let start = Date.now();
                let getSchemaResponse = await indy.submitRequest(this.poolHandle, getSchemaRequest);
                let end = Date.now();
                //console.log(getSchemaResponse);

                if (getSchemaResponse.op == "REPLY" && getSchemaResponse.result.seqNo > 0) {

                    let [, schemaJson] = await indy.parseGetSchemaResponse(getSchemaResponse);
                    //console.log(schemaJson);
                    console.log(`Read schema: ${getSchemaResponse.result.data.name} on block ${getSchemaResponse.result.seqNo} from ledger`);
                    this.readMaterial.schemas[index]["schemaJson"] = schemaJson;
                    return Promise.resolve(end - start);

                } else {

                    console.log(getSchemaResponse);
                    return Promise.reject(-1);
                }

            } catch (err) {
                console.log(err);
                return Promise.reject(-1);
            }
        }

        async writeCredDef(n = undefined) {

            var index;
            try {
                if (typeof n !== 'undefined') {
                    if (n < 0) {
                        index = this.readMaterial.dids.length + n;
                    } else {
                        index = n;
                    }
                } else {
                    index = Math.floor(Math.random() * this.readMaterial.dids.length);
                }
                console.log(`did index: ${index}`);

                let walletName = this.readMaterial.dids[index].walletName;
                let did = this.readMaterial.dids[index].did;

                let walletConfig = {'id': walletName};
                let walletCredentials = {'key': "key" + walletName};

                let m = Math.floor(Math.random() * this.readMaterial.schemas.length)
                let schema = this.readMaterial.schemas[m];
                let schemaId = schema.schemaId;
                console.log(`Schema Id: ${schemaId}`);

                var schemaJson;
                if (schema.schemaJson) {
                    schemaJson = schema.schemaJson;
                } else {
                    console.log(`Getting schema from ledger as it is not available locally...`)
                    let getSchemaRequest = await indy.buildGetSchemaRequest(did, schemaId).catch(err => console.log(err));
                    console.log(JSON.stringify(getSchemaRequest))
                    let getSchemaResponse = await indy.submitRequest(this.poolHandle, getSchemaRequest).catch(err => console.log(err));
                    //console.log(JSON.stringify(getSchemaResponse.op))
                    //console.log("\nSchema Response: ")
                    //console.log(getSchemaResponse);
                    [, schemaJson] = await indy.parseGetSchemaResponse(getSchemaResponse).catch(err => console.log(err));
                    //console.log(schemaId);
                    //console.log(schemaJson);
                }
                //console.log(`schemaJson: ${JSON.stringify(schemaJson)}`)

                let wallet = await indy.openWallet(walletConfig, walletCredentials).catch(err => console.log(err));
                let [credDefId, credDefJson] = await indy.issuerCreateAndStoreCredentialDef(wallet, did, schemaJson, 'TAG1', 'CL', '{"support_revocation": true}').catch(err => console.log(err));
                //console.log(credDefId);
                //console.log(credDefJson);

                let credDefRequest = await indy.buildCredDefRequest(did, credDefJson).catch(err => console.log(err));
                //console.log(credDefRequest);

                let start = Date.now();
                let credDefResponse = await indy.signAndSubmitRequest(this.poolHandle, wallet, did, credDefRequest).catch(err => console.log(err));
                await indy.closeWallet(wallet);

                if (credDefResponse.op == 'REPLY' && credDefResponse.result.txnMetadata.seqNo > 0) {

                    //console.log(credDefResponse);
                    console.log(`Wrote credential definition ${credDefResponse.result.txnMetadata.txnId} to ledger`);
                    this.readMaterial.credDefs.push({
                        "walletName": walletName,
                        "did": did,
                        "schemaId": schemaId,
                        "credDefId": credDefId
                    });
                    let end = Date.now();

                    return Promise.resolve(end - start);

                } else {

                    console.log(credDefRespone);
                    return Promise.reject(-1);

                }
            } catch (err) {

                console.log(err);
                try {
                    await indy.closeWallet(wallet);
                } catch (err) {
                }
                return Promise.reject(-1);

            }
        }

        async readCredDef() {

            try {

                let n = Math.floor(Math.random() * this.readMaterial.credDefs.length);
                let credDefId = this.readMaterial.credDefs[n].credDefId;
                //console.log(credDefId);

                let did = this.readMaterial.dids[Math.floor(Math.random() * this.readMaterial.dids.length)].did;
                //console.log(did);

                let getCredDefRequest = await indy.buildGetCredDefRequest(did, credDefId).catch(err => console.log(err));
                //console.log(getCredDefRequest);
                let start = Date.now();
                let getCredDefResponse = await indy.submitRequest(this.poolHandle, getCredDefRequest).catch(err => console.log(err));
                //console.log(getCredDefResponse);
                let end = Date.now();

                if (getCredDefResponse.op == 'REPLY' && getCredDefResponse.result.seqNo > 0) {
                        let [credDefID, credDefJson] = await indy.parseGetCredDefResponse(getCredDefResponse).catch(err => console.log(err));
                        console.log(`Read credential definition ${credDefId} from the ledger`);
                        //console.log(credDefID);
                        //console.log(credDefJson)
                        this.readMaterial.credDefs[n]["credDefJson"] = credDefJson;
                        return Promise.resolve(end - start)
                    } else {

                    console.log(getCredDefResponse);
                    return Promise.reject(-1);

                    }
            } catch (err) {

                return Promise.reject(-1);

            }
        }

        async writeRevRegDef(n = undefined) {

            var index;
            var wallet;
            try {
                if (typeof n !== 'undefined') {
                    if (n < 0) {
                        index = this.readMaterial.credDefs.length + n;
                    } else {
                        index = n;
                    }
                } else {
                    index = Math.floor(Math.random() * this.readMaterial.credDefs.length);
                }
                console.log(`credDef index: ${index}`);

                let credDef = this.readMaterial.credDefs[index];
                let credDefId = credDef.credDefId;
                //console.log(credDefId);
                let schemaId = credDef.schemaId;
                //console.log(schemaId);
                let walletName = credDef.walletName;
                //console.log(walletName);
                let walletConfig = {'id': walletName}
                let walletCredentials = {'key': "key" + walletName}
                let did = credDef.did;
                //console.log(did);

                var credDefJson;
                if (credDef.credDefJson) {
                    credDefJson = credDef.credDefJson;
                } else {
                    console.log(`Fetching credDefJson from ledger`);

                    let getCredDefRequest = await indy.buildGetCredDefRequest(did, credDefId).catch(err => console.log(err));
                    //console.log(getCredDefRequest);

                    let getCredDefResponse = await indy.submitRequest(this.poolHandle, getCredDefRequest).catch(err => console.log(err));
                    //console.log(getCredDefResponse);

                    let [credDefID, credDefJson] = await indy.parseGetCredDefResponse(getCredDefResponse).catch(err => console.log(err));
                    //console.log(credDefID);
                    //console.log(credDefJson)
                }

                let tailsWriter = await indy.openBlobStorageWriter('default', tailsWriterConfig).catch(err => console.log(err));
                //console.log("TailsWriter: " + tailsWriter)
                let rvocRegDefTag = 'cred_def_tag'
                let rvocRegDefConfig = {"max_cred_num": 100, 'issuance_type': 'ISSUANCE_ON_DEMAND'}

                wallet = await indy.openWallet(walletConfig, walletCredentials).catch(err => console.log(err));
                //console.log("walletHandle: " + wallet);
                let resp = await indy.issuerCreateAndStoreRevocReg(wallet, did, "CL_ACCUM", rvocRegDefTag, credDefId, rvocRegDefConfig, tailsWriter).catch(err => console.log(err));

                let [revRegId, revRegDef] = resp;
                let revocRegDefRequest = await indy.buildRevocRegDefRequest(did, revRegDef).catch(err => console.log(err));
                //console.log(revocRegDefRequest);

                let start = Date.now();
                let revocRegDefResponse = await indy.signAndSubmitRequest(this.poolHandle, wallet, did, revocRegDefRequest).catch(err => console.log(err));
                await indy.closeWallet(wallet);
                //console.log(revocRegDefResponse);
                let end = Date.now();
                //console.log(revocRegDefResponse);
                //console.log(revocRegDefResponse.result);
                //console.log(revocRegDefResponse.result.txnMetadata);

                if (revocRegDefResponse.op == "REPLY" && revocRegDefResponse.result.txnMetadata.seqNo > 0) {
                    this.readMaterial.revRegs.push({
                        "walletName": walletName,
                        "did": did,
                        "schemaId": schemaId,
                        "credDefId": credDefId,
                        "revRegId": revRegId
                    });

                    return Promise.resolve(end - start);
                } else {
                    console.log(revocRegDefResponse);
                    return Promise.reject(-1);
                }

            } catch (err) {
                console.log(err);
                try {
                    await indy.closeWallet(wallet);
                } catch (e) {
                    console.log(e);
                }
                return Promise.reject(err);
            }
        }

        async readRevRegDef() {

            try {

                let n = Math.floor(Math.random() * this.readMaterial.revRegs.length);
                let revRegDef = this.readMaterial.revRegs[n];
                //console.log(revRegDef.revRegId);

                let revRegDefId = revRegDef.revRegId;
                let did = revRegDef.did;

                let getRevocRegDefRequest = await indy.buildGetRevocRegDefRequest(did, revRegDefId).catch(err => console.log(err));
                //console.log(getRevocRegDefRequest);
                let start = Date.now();
                let getRevocRegDefResponse = await indy.submitRequest(this.poolHandle, getRevocRegDefRequest).catch(err => console.log(err));
                //console.log(getRevocRegDefResponse);
                let end = Date.now();
                let [revocRegDefID, revocRegDefJson] = await indy.parseGetRevocRegDefResponse(getRevocRegDefResponse).catch(err => console.log(err));
                //console.log(revocRegDefID);
                console.log(`Read ${revocRegDefID} from the ledger`);
                //console.log(revocRegDefJson)

                this.readMaterial.revRegs[n]["revRegJson"] = revocRegDefJson;

                return Promise.resolve(end - start)
            } catch (err) {
                console.log(err);
                return Promise.reject(-1);
            }
        }

        async writeRevRegDelta() {

            if (this.readMaterial.revRegWallets.length != this.readMaterial.revRegDefIDs.length) {
                console.log("different lengths");
                console.log(this.readMaterial);
            }


            let n1 = Math.floor(Math.random() * this.readMaterial.revRegWallets.length);
            let n2 = Math.floor(Math.random() * this.readMaterial.revRegDefIDs.length);


            let revRegDefId = this.readMaterial.revRegDefIDs[n1];
            let credDefId = revRegDefId.split(":").slice(2, 7).join(":");
            let schemaId = this.readMaterial.revRegSchemaIDs[n1];
            let did = credDefId.split(":")[0];
            console.log("RevRegDefId: " + revRegDefId);
            console.log("CredDefId: " + credDefId);

            let walletName = this.readMaterial.revRegWallets[n1];
            console.log(walletName);
            let walletConfig = {'id': walletName};
            let walletCredentials = {'key': "key" + walletName};

            let wallet = await indy.openWallet(walletConfig, walletCredentials).catch(err => console.log(err));
            console.log("walletHandle: " + wallet);

            let getCredDefRequest = await indy.buildGetCredDefRequest(did, credDefId).catch(err => console.log(err));
            console.log(getCredDefRequest);
            let getCredDefResponse = await indy.submitRequest(this.poolHandle, getCredDefRequest).catch(err => console.log(err));
            console.log(getCredDefResponse);
            let [credDefID, credDefJson] = await indy.parseGetCredDefResponse(getCredDefResponse).catch(err => console.log(err));


            let masterSecretId = await indy.proverCreateMasterSecret(wallet, "myMasterSecret").catch(err => {
                console.log(err)
                if (err.message = "AnoncredsMasterSecretDuplicateNameError") {
                    masterSecretId = "myMasterSecret";
                } else {
                    console.log(err)
                    console.log("\nError Message: "+ err.message)
                    return Promise.reject("Issue with master secret")
                }
            });
            console.log("Master Secret Id: " + masterSecretId);

            let credOffer = await indy.issuerCreateCredentialOffer(wallet, credDefId);
            console.log("\nCredential Offer: ");
            console.log(credOffer);

            let [credReq, credReqMetadata] = await indy.proverCreateCredentialReq(wallet, did, credOffer, credDefJson, masterSecretId);
            console.log("\nCredential Request: ");
            console.log(credReq);
            console.log("\nCredential Request Metadata: ");
            console.log(credReqMetadata);


            let  blobStorageReaderHandle = await indy.openBlobStorageReader('default', tailsWriterConfig);
            console.log("\nblobStorageReaderHandle: ");
            console.log(blobStorageReaderHandle);

            let getSchemaRequest = await indy.buildGetSchemaRequest(this.stewardDid, schemaId).catch(err => console.log(err));
            console.log(JSON.stringify(getSchemaRequest));

            let getSchemaResponse = await indy.submitRequest(this.poolHandle, getSchemaRequest).catch(err => console.log(err));
            console.log(getSchemaResponse);
            console.log("\nAttribute values: ");
            console.log(getSchemaResponse.result.data.attr_names)

            let credValues = {}
            getSchemaResponse.result.data.attr_names.forEach(key => {
                credValues[key] = {"raw": "male", "encoded": "5944657099558967239210949258394887428692050081607692519917050"}
            });
            console.log(credValues);

            let [cred, revId, revRegDelta] = await indy.issuerCreateCredential(wallet, credOffer, credReq, credValues, revRegDefId, blobStorageReaderHandle).catch(err => console.log(err));
            console.log("\nCredential: ")
            console.log(cred);
            console.log("\nCredential Revocation ID:")
            console.log(revId);
            console.log("\nCredential Revocation Delta: ")
            console.log(revRegDelta);

            let revocRegEntryRequest = await indy.buildRevocRegEntryRequest(did, revRegDefId, "CL_ACCUM", revRegDelta).catch(err => console.log(err));
            delete revocRegEntryRequest.operation.value.prevAccum
            console.log("\nRevocation Entry Request: ")
            console.log(revocRegEntryRequest)
            let start = Date.now();
            let revocRegEntryResponse = await indy.signAndSubmitRequest(this.poolHandle, wallet, did, revocRegEntryRequest).catch(err => console.log(err));
            console.log("\nRevocation Entry Response: ")
            console.log(revocRegEntryResponse)

            try {
                let res = await indy.parseGetRevocRegResponse(revocRegEntryResponse).catch(err => console.log(err));
                console.log(res);
            } catch(err) {
                console.log(err);
            }
                //console.log(res);
                //let [revocRegDefId, revocReg, timestamp] = await indy.parseGetRevocRegResponse(revocRegEntryResponse).catch(err => console.log(err));
            let end = Date.now();
            //console.log("\nRevocation Registry State at " + timestamp + ":");
            //console.log(revocReg);

            await indy.closeWallet(wallet);

            return Promise.resolve(end-start)

        }

        async readRevRegDelta() {

            try {

                let n = Math.floor(Math.random() * this.readMaterial.revRegDefIDs.length);
                let revRegDefId = this.readMaterial.revRegDefIDs[n];
                console.log(revRegDefId);

                let did = this.readMaterial.DIDs[Math.floor(Math.random() * this.readMaterial.DIDs.length)];
                console.log(did);

                console.log("\nTimestamp: " + Date.now());

                let getRevocRegDeltaRequest = await indy.buildGetRevocRegDeltaRequest(did, revRegDefId, 0, Date.now() - 5000).catch(err => console.log(err));
                console.log(getRevocRegDeltaRequest);
                getRevocRegDeltaRequest.operation.to = Date.now() - 5000
                console.log(getRevocRegDeltaRequest);
                let start = Date.now()
                let getRevocRegDeltaResponse = await indy.submitRequest(this.poolHandle, getRevocRegDeltaRequest);
                let end = Date.now()
                console.log(getRevocRegDeltaResponse);
                console.log("\n")
                console.log(JSON.stringify(getRevocRegDeltaResponse))

                let [, revReg, timestamp] = await indy.parseGetRevocRegDeltaResponse(getRevocRegDeltaResponse);
                console.log("\nRevocation Registry State: " + revReg);
                console.log("\nTimestamp: " + timestamp)

                return Promise.resolve(end - start)

            } catch (err) {
                console.log(err);
                return Promise.reject(-1);
            }

        }

        async revokeCredential() {

            let revRegDeltaAfterRevocation = await indy.issuerRevokeCredential(issuer.wallet, issuer.blobStorageReaderHandle, issuer.revRegDefId, issuer.credRevId).catch(err => console.log(err));
            console.log("\nRevocation Delta after Revocation: ");
            console.log(revRegDeltaAfterRevocation);
            let revocRegEntryRequest = await indy.buildRevocRegEntryRequest(did, revRegDefId, "CL_ACCUM", revRegEntry).catch(err => console.log(err));
            console.log("\nRevocation Delta Request:")
            console.log(revocRegEntryRequest)

            let start = Date.now();
            let revocRegEntryResponse = await indy.signAndSubmitRequest(this.poolHandle, wallet, did, revocRegEntryRequest).catch(err => console.log(err));
            console.log("\nResponse from Ledger:")
            console.log(revocRegEntryResponse);
            let end = Date.now();

            return Promise.resolve(end-start)

        }
    }

    module.exports = Bench;