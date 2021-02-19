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

const Bench = require("./wrapper.js")
const bench = new Bench()

async function test() {

    await bench.init().catch(err => console.log(err))
    let result
    let start

    console.log("")
    console.log("===Starting the test===")
    console.log("")
    console.log("")
    console.log("------------------------------")
    console.log("")
    console.log("")

    start = Date.now()
    result = await bench.writeDataPublic("100", "1000").catch(err => console.log(err))
    console.log("writeData with key=100, val=1000:  " + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.writeDataPublic("100", "1000").catch(err => console.log(err))
    console.log("writeData with key=100, val=1000:  " + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.writeDataPublic("42", "21").catch(err => console.log(err))
    console.log("writeData with key=42, val=21:  " + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readDataPublic("42").catch(err => console.log(err))
    console.log("readData with key=42: " + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.invokeMatrixMultiplicationPublic(10).catch(err => console.log(err))
    console.log("matrixMultiplication with n=10: " + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

};

test()
