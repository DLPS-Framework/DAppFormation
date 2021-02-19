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

const config = require("./config.json");
//console.log(config);

const userName = config.userName;
const connector = require(__dirname + "/connector");
const collection = config.collection;

/* const bufferLocation = config.bufferLocation;
const buffer = new Buffer(1024 * config.bufferSize);
const bufferSize = config.bufferSize; */

/**
 * module description
 * @module Bench
 */
class Bench {
    /**
     * Always launch after instantiating
     */
    async init() {
        await connector.init(userName);
    }

    /**
     * Always launch after completion
     */
    async close() {
        await connector.disconnect();
    }

    /**
     * writing data
     * @param key
     * @param value
     */

    async writeDataPublic(key, value) {
        let start = Date.now();
        var returnValue = await connector.submit(["writeData", key.toString(), value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async writeDataPrivate(key, value) {
        let start = Date.now();
        if (typeof collection == "string") {
            var returnValue = await connector
                .submit(["writeDataPrivate", collection.toString(), key.toString(), value.toString()])
                .catch(err => {
                    console.log(err);
                    return Promise.reject(err);
                });
        } else {
            var returnValue = await connector
                .submit(["writeDataPrivateImplicit", collection.toString(), key.toString(), value.toString()])
                .catch(err => {
                    console.log(err);
                    return Promise.reject(err);
                });
        }
        console.log(returnValue);
        return Promise.resolve(Date.now() - start);
    }

    async writeDataPublicBufferClient(key, size) {
        const buffer = new Buffer(Number(size));
        let start = Date.now();
        const value = (Math.floor(Math.random() * 10000)).toString() + buffer.toString()
        var returnValue = await connector.submit(["writeData", key.toString(), value]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async writeDataPrivateBufferClient(key, value) {
        const buffer = new Buffer(Number(value));
        let start = Date.now();
        var returnValue = await connector
            .submit(["writeDataPrivate", collection.toString(), key.toString(), buffer.toString()])
            .catch(err => {
                return Promise.reject(err);
            });
        return Promise.resolve(Date.now() - start);
    }

    async writeDataPublicBufferPeer(key, value) {
        let start = Date.now();
        var returnValue = await connector.submit(["writeDataPublicBufferPeer", key.toString(), value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async writeDataPrivateBufferPeer(key, value) {
        let start = Date.now();
        var returnValue = await connector
            .submit(["writeDataPrivateBufferPeer", collection.toString(), key.toString(), value.toString()])
            .catch(err => {
                return Promise.reject(err);
            });
        return Promise.resolve(Date.now() - start);
    }

    /**
     * reading data
     * @param key
     * @param account
     */

    async readDataPublic(key) {
        let start = Date.now();
        let returnValue = await connector.query(["readData", key.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async readDataPrivate(key) {
        let start = Date.now();
        if (typeof collection == String) {
            var returnValue = await connector.query(["readDataPrivate", collection.toString(), key.toString()]).catch(err => {
                return Promise.reject(err);
            });
        } else {
            var returnValue = await connector.query(["readDataPrivateImplicit", collection.toString(), key.toString()]).catch(err => {
                return Promise.reject(err);
            });
        }
        return Promise.resolve(Date.now() - start);
    }

    /**
     * writingMuchData
     * @params start, end
     */

    async writeMuchDataPublic(len, start, delta) {
        let startTime = Date.now();
        let returnValue = await connector.submit(["writeMuchData", len.toString(), start.toString(), delta.toString()]).catch(err => {
            return Promise.reject(err);
        });
        console.log("returnValue" + returnValue);
        if (returnValue == "Cannot read property 'submitTransaction' of undefined") {
            return Promise.reject("-1");
        }
        return Promise.resolve(Date.now() - startTime);
    }

    async writeMuchDataPrivate(len, start, delta) {
        let startTime = Date.now();
        let returnValue = await connector
            .submit(["writeMuchDataPrivate", collection.toString(), len.toString(), start.toString(), delta.toString()])
            .catch(err => {
                return Promise.reject(err);
            });
        return Promise.resolve(Date.now() - startTime);
    }

    /**
     * readingMuchData
     * @params start, end
     */
    async readMuchDataPublic(len, start) {
        let startTime = Date.now();
        let returnValue = await connector.query(["readMuchData", len.toString(), start.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - startTime);
    }

    async readMuchDataPrivate(len, start) {
        let startTime = Date.now();
        let returnValue = await connector
            .query(["readMuchDataPrivate", collection.toString(), len.toString(), start.toString()])
            .catch(err => {
                return Promise.reject(err);
            });
        return Promise.resolve(Date.now() - startTime);
    }

    /**
     * Doing Nothing
     * @param account
     * @param array of public keys for private transactions
     */

    async queryDoNothingPublic() {
        let start = Date.now();
        let returnValue = await connector.query(["doNothing"]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async queryDoNothingPrivate() {
        let start = Date.now();
        let returnValue = await connector.query(["doNothing"]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async invokeDoNothingPublic() {
        let start = Date.now();
        let returnValue = await connector.submit(["doNothing"]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async invokeDoNothingPrivate() {
        let start = Date.now();
        let returnValue = await connector.submit(["doNothing"]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    /**
     * Private Matrix Multiplication
     * @param value
     * @param account
     * @param array of public keys for private transactions
     */
    async queryMatrixMultiplicationPublic(value) {
        let start = Date.now();
        let returnValue = await connector.query(["matrixMultiplication", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async queryMatrixMultiplicationPrivate(value) {
        let start = Date.now();
        let returnValue = await connector.query(["matrixMultiplication", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async invokeMatrixMultiplicationPublic(value) {
        let start = Date.now();
        let returnValue = await connector.submit(["matrixMultiplication", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async invokeMatrixMultiplicationPrivate(value) {
        let start = Date.now();
        let returnValue = await connector.submit(["matrixMultiplication", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async setMatrixMultiplicationPublic(value) {
        let start = Date.now();
        let returnValue = await connector.submit(["setMatrixMultiplication", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async setMatrixMultiplicationPrivate(value) {
        let start = Date.now();
        let returnValue = await connector.submit(["setMatrixMultiplication", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async complexQueryPublic(value) {
        let start = Date.now();
        let returnValue = await connector.query(["complexQuery", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async complexQueryPrivate(value) {
        let start = Date.now();
        let returnValue = await connector.query(["complexQueryPrivate", collection.toString(), value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async ccQueryPublic(value) {
        let start = Date.now();
        let returnValue = await connector.query(["ccQuery", value.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(Date.now() - start);
    }

    async measurePutState(key, value, count) {
        var returnValue = await connector.submit(["measurePutState", key.toString(), value.toString(), count.toString()]).catch(err => {
            return Promise.reject(err);
        });
        return Promise.resolve(returnValue);
    }



}

module.exports = Bench;
