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

const Bench = require("./wrapper.js")

var numCPUs = require("os").cpus().length;


async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function test(n){

    let bench = new Bench();

    let start
    let result

    //initializing the contracts
    await bench.init(n).catch(err => {console.log(err)})

    try {

        result = await bench.createWallet()
        console.log("createWallet")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")


        result = await bench.writeDID(-1)
        console.log("writeDID")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        await sleep(2000)

        result = await bench.readDID()
        console.log("readDID")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        result = await bench.writeAttrib(-1)
        console.log("writeAttrib")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        await sleep(2000)

        result = await bench.readAttrib()
        console.log("readAttrib")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        result = await bench.writeSchema(2)
        console.log("writeSchema")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        await sleep(2000)

        result = await bench.readSchema(-1)
        console.log("readSchema")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        result = await bench.writeCredDef(-1)
        console.log("writeCredDef")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        await sleep(2000)

        result = await bench.readCredDef(-1)
        console.log("readCredDef")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        result = await bench.writeRevRegDef()
        console.log("writeRevRegDef")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        await sleep(2000)

        result = await bench.readRevRegDef()
        console.log("readRevRegDef")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        /*

        result = await bench.writeRevRegDelta()
        console.log("writeRevRegDelta")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        await sleep(10000);

        result = await bench.readRevRegDelta()
        console.log("readRevRegDelta")
        console.log("elapsed time: " + result)
        console.log("")
        console.log("=======================")
        console.log("")

        */

    } catch (err) {
        console.log(err)
    }

    await bench.close(n).catch(err => {console.log(err)})

}

async function main()
{
    for (let j = 0; j < 2; j++) {
        for (let k = 0; k < 10; k++) {
            try {
                await test(j)
            } catch (err) {
                console.log(err);
            }
        }
    }
}

main()

