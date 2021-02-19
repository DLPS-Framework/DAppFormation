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

const agentkeepalive = require('agentkeepalive');
const myagent = new agentkeepalive({
    maxSockets: 50,
    maxKeepAliveRequests: 100,
    maxKeepAliveTime: 100
});

const config = require('./config.json')

const nano = require('nano')(
    {
        url: config.couch_address,
        requestDefaults: {
           'agent': myagent,
           'timeout': 5000
        }
    });


/**
 * module description
 * @module Bench
 */
class Bench {

    /**
     * Always launch after instantiating
     */
    async init() {

        console.log("Creating bench database...\n")
        let response = await nano.db.create('bench').catch(err => {
            if (err && err.statusCode != 412) {
                console.error(err);
                return Promise.reject(-1);
            }
            else if(err) {
                console.log('Database bench already exists\n');
            }
            else {
               console.log('Database bench successfully created\n');
           }
        });
        // console.log(response)
        let bench = nano.use('bench');
        this.bench = bench;
        return Promise.resolve(true)

    };

    async writeDataPublic(key, value) {

        try {
            let response = await this.bench.insert({'value': value}, key).catch(err => {
                throw(err);
            });
            return Promise.resolve(1);
        } catch (err) {
             if (err.statusCode != 409) {
                 console.log(err);
                 return Promise.reject(-1);
             } else {
                 console.log("Overwriting existing entry");
                 let response2 = await this.bench.get(key).catch(err => {
                     console.log(err);
                     return Promise.reject(-1);
                 });
                 console.log("Got existing version");
                 let response3 = await this.bench.insert({'_id': response2.id, '_rev': response2.rev, 'value': value}).catch(err => {
                     console.log(err);
                     return Promise.reject(-1);
                 });
                 return Promise.resolve(1);
             };
        };
    };

    async readDataPublic(key) {

        let response = await this.bench.get(key).catch(err => {
            console.log(err);
            return Promise.reject(-1);
        });
        return Promise.resolve(response.value);
    };

    async close(){
        return Promise.resolve(true);
    };

}

module.exports = Bench;
