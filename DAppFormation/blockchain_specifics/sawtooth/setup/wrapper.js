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

const {createContext, CryptoFactory} = require("sawtooth-sdk/signing")
const context = createContext("secp256k1")
const cryptoFactory = new CryptoFactory(context)

const {createHash} = require("crypto")
const {protobuf} = require("sawtooth-sdk")
const cbor = require("cbor")

const fetch = require("node-fetch")

const config = require("./config.json")

const Base64 = require("js-base64").Base64


/**
 * module description
 * @module Bench
 */
class Bench {

    /**
     * Always launch after instantiating
     */
    async init() {
        const privateKey = context.newRandomPrivateKey()
        //console.log("privateKey: " + privateKey)
        const signer = cryptoFactory.newSigner(privateKey)
        //console.log("Signer: " + signer)
        this.signer = signer
        return Promise.resolve(true)
    };

    async intkeySet(key, value) {

        let payload = {
            Verb: "set",
            Name: key,
            Value: value
        }
        //console.log("payload: " + JSON.stringify(payload))
        let inputs = ["1cf126"]
        let outputs = inputs
        let batchListBytes = this.create_batch("intkey", payload, inputs, outputs);
        //console.log("batchListBytes: " + batchListBytes)

        let link = await this.submit(batchListBytes).catch(err => console.log(err));
        //console.log("link: " + link)

        let status = await this.wait_till_committed(link, 50, 20000)
        //console.log("Status in wrapper: " + status)

        return Promise.resolve(status)
    };

    async writeDataPublic(key, value) {

        let payload = {
            method: "writeData",
            key: key,
            value: value
        }
        let result = await this.sendTransaction(payload).catch(err => {return Promise.reject(err)})
        return Promise.resolve(1)

    };

    async readDataPublic(key) {

        //console.log(createHash("sha512").update("benchcontract").digest("hex"))
        let namespace = createHash("sha512").update("benchcontract").digest("hex").substring(0, 6)
        //console.log(createHash("sha512").update(key).digest("hex"))
        let address = namespace + createHash("sha512").update("key_" + key).digest("hex").substring(0, 64)
        //console.log("address: " + address)

        let res = await this.get(config.rest_address + "/state?address=" + address).catch(err => console.log(err));
        //console.log("String: " + JSON.stringify((res)))
        //for (let i = 0; i < res["data"].length; i++) {
            //console.log("address: " + res["data"][i]["address"] + ";      data: "  + Base64.decode(res["data"][i]["data"]))
            //if (res["data"][i]["address"] == address) {
                //console.log("MATCH")
                //console.log("data: " + Base64.decode(res["data"][i]["data"]))
                //break
            //}
        //}
        try {
            //console.log("data: " + Base64.decode(res["data"][0]["data"]))
            return Promise.resolve(Base64.decode(res["data"][0]["data"]))
        } catch (err) {
            console.log(err)
            return Promise.reject(-1)
        }

    };

    async invokeMatrixMultiplicationPublic(n, id) {

        let payload = {
            method: "matrixMultiplication",
            arg: n.toString(),
            id: Math.floor(Math.random() * 10000000).toString()
        }
        let result = await this.sendTransaction(payload).catch(err => {return Promise.reject(err)})
        return Promise.resolve(1)

    };

    async invokeDoNothingPublic() {

        let payload = {
            method: "doNothing",
            id: Math.floor(Math.random() * 10000000).toString()
        }
        let result = await this.sendTransaction(payload).catch(err => {return Promise.reject(err)})
        return Promise.resolve(1)
    };

    async writeMuchData(len, start, delta) {

        let payload = {
            method: "writeMuchData",
            len: len,
            start: start,
            delta: delta
        }
        let result = await this.sendTransaction(payload).catch(err => {return Promise.reject(err)})
        return Promise.resolve(1)
    };

    async readMuchData(len, start) {

        let payload = {
            method: "readMuchData",
            len: len,
            start: start
        }
        let result = await this.sendTransaction(payload).catch(err => {return Promise.reject(err)})
        return Promise.resolve(1)
    }

    async sendTransaction(payload) {

        //console.log("payload: " + JSON.stringify(payload))
        let inputs = ["dc7a45"]
        let outputs = inputs
        let batchListBytes = this.create_batch("benchcontract", payload, inputs, outputs)
        //console.log("batchListBytes: " + batchListBytes)

        let link = await this.submit(batchListBytes).catch(err => console.log(err));
        console.log("link: " + link)

        let status = await this.wait_till_committed(link, 1000, 30000)
        //console.log("Status in wrapper: " + status)
        if (status == "COMMITTED") {
            return Promise.resolve(status)
        }
        return Promise.reject(status)
    };


    create_batch(family_name, payload, inputs, outputs){

        let payloadBytes = cbor.encode(payload)
        //console.log("payloadBytes: " + payloadBytes.toString())

        let transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: family_name,
            familyVersion: "1.0",
            inputs: inputs,
            outputs: outputs,
            signerPublicKey: this.signer.getPublicKey().asHex(),
            // In this example, we"re signing the batch with the same private key,
            // but the batch can be signed by another party, in which case, the
            // public key will need to be associated with that key.
            batcherPublicKey: this.signer.getPublicKey().asHex(),
            // In this example, there are no dependencies.  This list should include
            // an previous transaction header signatures that must be applied for
            // this transaction to successfully commit.
            // For example,
            // dependencies: ["540a6803971d1880ec73a96cb97815a95d374cbad5d865925e5aa0432fcf1931539afe10310c122c5eaae15df61236079abbf4f258889359c4d175516934484a"],
            dependencies: [],
            payloadSha512: createHash("sha512").update(payloadBytes).digest("hex")
        }).finish()
        //console.log("transactionHeaderBytes: " + transactionHeaderBytes.toString)

        let header_signature = this.signer.sign(transactionHeaderBytes)
        //console.log("header signature: " + header_signature)

        let transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: header_signature,
            payload: payloadBytes
        })
        //console.log("transaction: " + JSON.stringify(transaction))

        let transactions = [transaction]
        let batchHeaderBytes = protobuf.BatchHeader.encode({
            signerPublicKey: this.signer.getPublicKey().asHex(),
            transactionIds: transactions.map((txn) => txn.headerSignature),
        }).finish()
        //console.log("batchHeaderBytes: " + batchHeaderBytes)

        let batch_signature = this.signer.sign(batchHeaderBytes)
        //console.log("batch_signature: " + batch_signature)

        let batch = protobuf.Batch.create({
            header: batchHeaderBytes,
            headerSignature: batch_signature,
            transactions: transactions
        })
        //console.log("batch: " + JSON.stringify(batch))

        let batchListBytes = protobuf.BatchList.encode({
            batches: [batch]
        }).finish()
        //console.log("batchListBytes:" + batchListBytes)

        return batchListBytes
    };

    async submit(batchListBytes) {
        //console.log("Submitting transaction...")
        //console.log("Connecting to " + config.rest_address + "/batches")
        let response = await fetch(config.rest_address + "/batches", {
            method: "POST",
            body: batchListBytes,
            headers: {"Content-Type": "application/octet-stream"}
        }).catch(err => {return Promise.reject(err)})

        let json = await response.json().catch(err => {return Promise.reject(err)})
        console.log(" returning json: " + json.link)
        return Promise.resolve(json.link)
    };

    async get(url) {
        let response = await fetch(url, {
            method: "GET",
            headers: {"Content-Type": "application/octet-stream"}
        }).catch(err => {return Promise.reject(err)})

        let json = await response.json().catch(err => {return Promise.reject(err)})
        return Promise.resolve(json)
    };

    async wait_till_committed(url, delta, timeout) {

        let res
        let status = "PENDING"
        let timer = 0

        while (status == "PENDING" && timer*delta < timeout) {

            timer = timer + 1
            await new Promise(resolve => setTimeout(resolve, delta));
            console.log(Date.now())
            res = await this.get(url).catch(err => console.log(err));
            //console.log(res)
            status = res.data[0].status
            //console.log("status: " + status)
        }
        //console.log("Loop finished with status " + status)
        if (status == "COMMITTED") {
            //console.log("returning success")
            return Promise.resolve(status)
        }
        //console.log("returning fail")
        return Promise.reject(status)
    };

}

module.exports = Bench;