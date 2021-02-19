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

'use strict';
//NodeJS NPM und Truffle
// Smart Contract zuerst mit Truffle migrate deployen
// "truffle-contract": "^3.0.0",
//"web3": "^0.20.6"
const config = require("./config.json")
const Web3 = require("web3");
const TruffleContract = require("truffle-contract");
const provider = new Web3.providers.HttpProvider(config.node);
const web3 = new Web3(provider);

const artifactPublic = require(config.artifactPublic);

const account = config.account



/**
 * module description
 * @module Bench
 */
class Bench {

    /**
     * Always launch after instantiating
     */
    async init () {

        const MyContract2 = TruffleContract(artifactPublic);
        MyContract2.setProvider(provider);
        this.instance2 = await MyContract2.deployed().catch(err => {return Promise.reject(err); console.error(err)});
        return Promise.resolve(true);
    }

    /**
     * Always launch after completion
     */
    async close(){}


    async getAccounts()  {
        return new Promise((reject, resolve) => {
            web3.eth.getAccounts((err, res) => {
                reject(res);
                resolve(err);
            });
        });
    };

    async getBlockNumber()  {
        return new Promise((reject, resolve) => {
            web3.eth.getBlockNumber((err, res) => {
                reject(res);
                resolve(err);
            });
        });
    };

    /**
     * getter and setter for tmp
     */

    async getTmpPublic() {
        let returnValue = await this.instance2.getTmp({
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue)
    }


    async setTmpPublic(value) {
        let returnValue = await this.instance2.setTmp(value, {
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue.receipt.blockNumber)
    }



    /**
     * Matrix Multiplication
     * @param value
     * @param account
     * @param array of public keys for private transactions
     */

    async queryMatrixMultiplicationPublic(value) {
        let returnValue = await this.instance2.queryMatrixMultiplication(value, {
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue);
    };



    async invokeMatrixMultiplicationPublic(value) {
        let returnValue = await this.instance2.invokeMatrixMultiplication(value, {
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue.receipt.blockNumber);
    };



    async setMatrixMultiplicationPublic(value) {
        let returnValue = await this.instance2.setMatrixMultiplication(value, {
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue.receipt.blockNumber);
    };




     /**
     * Doing Nothing
     * @param account
     * @param array of public keys for private transactions
     */

     async queryDoNothingPublic() {
        let returnValue = await this.instance2.queryDoNothing({
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue);
    }



    async invokeDoNothingPublic() {
        let returnValue = await this.instance2.invokeDoNothing({
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue.receipt.blockNumber);
    }



    /**
     * writing data
     * @param key
     * @param value
     * @param account
     * @param array of public keys for private transactions
     */

    async writeDataPublic(key, value) {
        let returnValue = await this.instance2.writeData(key, value, {
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue.receipt.blockNumber);
    }



     /**
     * reading data
     * @param key
     * @param account
     * @param array of public keys for private transactions
     */

     async readDataPublic(key) {
        let returnValue = await this.instance2.readData(key, {
            from: account,
            gas: 300000000
        }).catch(err => {return Promise.reject(err)});
        return Promise.resolve(returnValue);
     }



     /**
     * writingMuchData
     * @params start, end
     * @param account
     * @param array of public keys for private transactions
     */

     async writeMuchDataPublic(len, start, delta) {
         let returnValue = await this.instance2.writeMuchData(parseInt(len, 10), parseInt(start, 10), parseInt(delta, 10), {
             from: account,
             gas: 300000000
         }).catch(err => {return Promise.reject(err)});
         return Promise.resolve(returnValue.receipt.blockNumber)
     }



     /**
     * readingMuchData
     * @params start, end
     * @param account
     * @param array of public keys for private transactions
     */

     async readMuchDataPublic(len, start) {
         let returnValue = await this.instance2.readMuchData(len, start, {
             from: account,
            gas: 300000000
         }).catch(err => {return Promise.reject(err)});
         return Promise.resolve(returnValue)
     }


}

module.exports = Bench;