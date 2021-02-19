/*
 * Copyright 2019  ChainLab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
const fetch = require("node-fetch");
const config = require('./config.json');

/**
 * module description
 * @module Bench
 */
class Bench {

    /**
     * Always launch after instantiating
     */
    async init() {
        return Promise.resolve(true);
    };

    async writeDataPublic(key, value) {

        let payload = JSON.stringify({"key": key.toString(), "value": value.toString()});
        console.log("Payload: " + payload);
        let result = await this.sendTransaction("writeData", "POST", payload).catch(err => {return Promise.reject(err)});
        return Promise.resolve(1);

    };

    async readDataPublic(key) {

        let payload = JSON.stringify({"key": key.toString()});
        console.log("Payload: " + payload);
        let result = await this.sendTransaction("readData", "POST", payload).catch(err => {return Promise.reject(err)});
        return Promise.resolve(1)
    }

    async invokeMatrixMultiplicationPublic(n) {
        let payload = JSON.stringify({"n": n.toString()});
        console.log("Payload: " + payload);
        let result = await this.sendTransaction("matrixMultiplication", "POST", payload).catch(err => {return Promise.reject(err)});
        return Promise.resolve(1)
    }

    async sendTransaction(url, method, payload) {

        let response = await this.submit(url, method, payload).catch(err => {
            console.log(err)
            return Promise.reject(-1)
        });
        console.log("Response " + response)

        return Promise.resolve(1)

    };

    async submit(url, method, payload) {
        console.log("Submitting transaction...");
        console.log("Connecting to " + config.leveldb_address);
        let response = await fetch("http://" + config.leveldb_address + "/" + url, {
            body: payload,
            headers: {
               "Content-Type": "application/x-www-form-urlencoded"
            },
            method: method
        }).catch(err => {
            return Promise.reject(err)
        });

        let text = await response.text();
        console.log(text);

        console.log("Status code: " + response.status);
        if (response.status == "200") {
            return Promise.resolve("1");
        } else {
            return Promise.reject("-1");
        }
    };

}

module.exports = Bench;
