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
const bench = new Bench();

async function test(){

    console.log("")
    console.log("===Starting the test===")
    console.log("")

    //initializing the contracts
    await bench.init().catch(err => console.log(err))

    /*

    let start = Date.now()
    result = await bench.queryDoNothingPublic()
    console.log("queryDoNothingPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.invokeDoNothingPublic()
    console.log("invokeDoNothingPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.queryMatrixMultiplicationPublic(5)
    console.log("queryMatrixMultiplicationPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")


     */

    start = Date.now()
    result = await bench.invokeMatrixMultiplicationPublic(5).catch(err => console.log(err))
    console.log("invokeMatrixMultiplicationPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    /*

    start = Date.now()
    result = await bench.setMatrixMultiplicationPublic(5)
    console.log("setMatrixMultiplicationPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readDataPublic("Hallo")
    console.log("readDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")


     */

    start = Date.now()
    result = await bench.writeDataPublic("Hallo", "Du").catch(err => console.log(err))
    console.log("writeDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readDataPublic("Hallo").catch(err => console.log(err))
    console.log("readDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    /*

    start = Date.now()
    result = await bench.readMuchDataPublic(5, 20)
    console.log("readMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.writeMuchDataPublic(5, 20, 1000)
    console.log("writeMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readMuchDataPublic(5, 20)
    console.log("readMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")



    start = Date.now()
    result = await bench.readMuchDataPublic(10, 15)
    console.log("readMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.writeMuchDataPublic(10, 20, 100)
    console.log("writeMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readMuchDataPublic(10, 15)
    console.log("readMuchDataPublic:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readMuchDataPublic2(10, 15)
    console.log("readMuchDataPublic2:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.writeMuchDataPublic2(10, 20, 100)
    console.log("writeMuchDataPublic2:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

    start = Date.now()
    result = await bench.readMuchDataPublic2(10, 20)
    console.log("readMuchDataPublic2:" + result)
    console.log("elapsed time: " + (Date.now()-start))
    console.log("")
    console.log("=======================")
    console.log("")

     */

    await bench.close().catch(err => { console.log(err) })
    console.log("Disconnected from fabric")

}

test()