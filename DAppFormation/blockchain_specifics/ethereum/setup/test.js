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
const bench = new Bench();

async function test(){

    let start
    let nr
    let result

    nr = await bench.getBlockNumber()
    console.log("blockNumber: " + nr)
    console.log("")
    console.log("===Starting the test===")
    console.log("")

    //initializing the contracts
    await bench.init().catch(err => {console.log(err)})

    start = Date.now()
    result = await bench.queryDoNothingPublic()
    nr = await bench.getBlockNumber()
    console.log("queryDoNothingPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")


    start = Date.now()
    result = await bench.invokeDoNothingPublic()
    nr = await bench.getBlockNumber()
    console.log("invokeDoNothingPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.queryMatrixMultiplicationPublic(5)
    nr = await bench.getBlockNumber()
    console.log("queryMatrixMultiplicationPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.invokeMatrixMultiplicationPublic(5)
    nr = await bench.getBlockNumber()
    console.log("invokeMatrixMultiplicationPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.getTmpPublic()
    nr = await bench.getBlockNumber()
    console.log("getTmpPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.setMatrixMultiplicationPublic(5)
    nr = await bench.getBlockNumber()
    console.log("setMatrixMultiplicationPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.getTmpPublic()
    nr = await bench.getBlockNumber()
    console.log("getTmpPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readDataPublic("Hallo")
    nr = await bench.getBlockNumber()
    console.log("readDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.writeDataPublic("Hallo", "Du")
    nr = await bench.getBlockNumber()
    console.log("writeDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readDataPublic("Hallo")
    nr = await bench.getBlockNumber()
    console.log("readDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readMuchDataPublic(10, 15)
    nr = await bench.getBlockNumber()
    console.log("readMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.writeMuchDataPublic(10, 20, 100)
    nr = await bench.getBlockNumber()
    console.log("writeMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readMuchDataPublic(10, 15)
    nr = await bench.getBlockNumber()
    console.log("readMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.setTmpPublic(100)
    nr = await bench.getBlockNumber()
    console.log("setTmpPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.getTmpPublic()
    nr = await bench.getBlockNumber()
    console.log("getTmpPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")


}

test()