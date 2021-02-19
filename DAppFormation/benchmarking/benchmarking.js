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


const cluster = require("cluster")
var numCPUs = require("os").cpus().length;

const crypto = require("crypto");

const converter = require("convert-array-to-csv")
const header = ["startTime", "endTime", "result"]
const { promisify } = require('util')
const fs = require("fs");
const writeFileAsync = promisify(fs.writeFile)

const Bench = require("./wrapper.js")

const stdio = require("stdio");
const args = stdio.getopt({
    "method": {key: "method", args: 1, description: "smart contract method", mandatory: true},
    "arg": {key: "arg", args: 1, description: "smart contract argument", mandatory: true},
	"arg2": {key: "arg2", args: 1, description: "second smart contract argument"},
    "mode": {key: "mode", args: 1, description: "public or private", mandatory: true},
	"duration": {key: "duration", args: 1, description: "time for which client sends requests", mandatory: true},
	"shape": {key: "shape", args: 1, description: "smooth or step or ramp", mandatory: true},
	"frequency": {key: "frequency", args: 1, description: "tx/s per cliemt", mandatory: true},
	"max_time": {key: "max_time", args: 1, description: "maximum waiting time", mandatory: true},
	//"val_size": {key: "val_size", args: 1, description: "size of the value to write in the KVS", mandatory: true}
});

function randomValueHex(len) {
    return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, len) // return required number of characters
}


const config = require("./config.json");
const keyspace_size = parseInt(config.keyspace_size)
const valuespace_size = parseInt(config.valuespace_size)

if ("numCPUs" in config) {
	numCPUs = parseInt(config.numCPUs)
}

console.log("Number of CPUs: " + numCPUs)
console.log("Keyspace size: " + keyspace_size)
console.log("Valuespace_size: " + valuespace_size)

//the chaincode/smart contract method (e.g., matrixMultiplication, readData, writeData, doNothing, ...
console.log("method: " + args.method)
//the argument(s) of the smart contract method (e.g. key/value for read/write, ...
console.log("arg: " + args.arg)
try{
	console.log("arg2: " + args.arg2)
}
catch(error) {
	console.log("No second argument given")
}
//specifies whether the execution is meant to be public or private (quorum only)
console.log("mode: " + args.mode)
//the duration of the experiment
console.log("duration: " + args.duration)
//the form of the sent transactions - smooth for uniform, step for peaks
console.log("shape: " + args.shape)
//the number of tx/s
console.log("frequency: " + args.frequency)
//the time after which waiting for responses is aborted and requests which have not been answered are regarded non-successful
console.log("maximum time: " + args.max_time)

const timeout = parseFloat(args.duration) + parseFloat(args.max_time)
console.log("Timeout: " + timeout)

//if (max_time < dur){
//	throw "maximum waiting time should be longer than the duration"
//}

//saves the timestamps for sending resp. receiving transactions and whether it was successful
var logs = []
var csvFromArrayOfArrays = converter.convertArrayToCSV(logs, {separator: " "})

//counts the yet received queries
var count = 0

//the frequency of each worker
const worker_frequency = args.frequency / numCPUs
console.log("Worker frequency: " + worker_frequency)

//the number of transactions which have to be sent during the total duration dur of the experiment
let totalDuration = args.duration

let numberOfSlots = Math.max(1, Math.floor(totalDuration * worker_frequency / 1000))
if (args.shape == "ramp") {
	numberOfSlots = 1
}

const slotDuration = totalDuration / numberOfSlots
const totalNumberPerSlot = Math.ceil(worker_frequency * slotDuration)

let totalCount= totalNumberPerSlot * numberOfSlots

let counter = 0

const start = Date.now()
console.log("Start: " + start)

console.log("Number of slots: " + numberOfSlots);
console.log("Slot duration: " + slotDuration);
console.log("Number per slot: " + totalNumberPerSlot);

async function helper(bench, n) {
	//console.log("Worker " + n + " is sending a transaction after " + (Date.now()-start).toString() + "ms");
	let logEntry = []
	let result
	//save the timestamp of the sending process
	logEntry[0] = Date.now()

	if ((Date.now()-start) > (totalDuration * 1000)){
	    console.log("Discarded transaction since time is up after " + (Date.now()-start).toString() + "ms");
	    count++;
	    if (count == totalCount) {
			console.log("All requests sent on worker " + n + " - saving file");
			csvFromArrayOfArrays = converter.convertArrayToCSV(logs, {separator: " "});
			try {
				await writeFileAsync(__dirname + "/benchmarking_worker" + process.pid + ".csv", csvFromArrayOfArrays);
				console.log("file saved for worker " + n + " - all promises resolved");
				await bench.close(n);
				return process.exit(0);
			} catch (err) {
				console.log(err)
			}
		}
	    return;
	}

	//execute chaincode/smart contract function
	try{
		if (args.method == "queryMatrixMultiplication" && args.mode == "public"){
		    result = await bench.queryMatrixMultiplicationPublic(args.arg)
		}
		else if (args.method == "invokeMatrixMultiplication" && args.mode == "public"){
		    result = await bench.invokeMatrixMultiplicationPublic(args.arg)
		}
		else if (args.method == "queryMatrixMultiplication" && args.mode == "private") {
			result = await bench.queryMatrixMultiplicationPrivate(args.arg)
		}
		else if (args.method == "invokeMatrixMultiplication" && args.mode == "private") {
			result = await bench.invokeMatrixMultiplicationPrivate(args.arg)
		}
		else if (args.method == "queryDoNothing" && args.mode == "public") {
				result = await bench.queryDoNothingPublic()
		}
		else if (args.method == "invokeDoNothing" && args.mode == "public") {
				result = await bench.invokeDoNothingPublic()
		}
		else if (args.method == "queryDoNothing" && args.mode == "private") {
			result = await bench.queryDoNothingPrivate()
		}
		else if (args.method == "invokeDoNothing" && args.mode == "private") {
			result = await bench.invokeDoNothingPrivate()
		}
		else if (args.method == "writeData" && args.mode == "public"){

			if (args.arg == "Buffer_Peer") {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				let value = args.arg2
				result = await bench.writeDataPublicBufferPeer(key, value)
			}
			else if (args.arg == "Buffer_Client") {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				let value = args.arg2
				result = await bench.writeDataPublicBufferClient(key, value)
			}
			else
			{
				let key = Math.floor(Math.random() * keyspace_size).toString()
				let value = Math.floor(Math.random() * valuespace_size).toString()
				result = await bench.writeDataPublic(key, value)
			}

		}
		else if (args.method == "writeData" && args.mode == "private"){

			if (args.arg == "Buffer_Peer") {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				let value = args.arg2
				result = await bench.writeDataPrivateBufferPeer(key, value)
			}
			else if (args.arg == "Buffer_Client") {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				let value = args.arg2
				result = await bench.writeDataPrivateBufferClient(key, value)
			}
			else {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				let value = Math.floor(Math.random() * valuespace_size).toString()
				result = await bench.writeDataPrivate(key, value)
			}
		}
		else if (args.method == "readData" && args.mode == "public"){

			if (args.arg == "ccQuery") {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				result = await bench.ccQueryPublic(key)
			}
			else if (args.arg == "complexQuery") {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				result = await bench.complexQueryPublic(key)
			}
			else {
				let key = Math.floor(Math.random() * keyspace_size).toString()
				result = await bench.readDataPublic(key)
			}
		}
		else if (args.method == "readData" && args.mode == "private"){
			let key = Math.floor(Math.random() * keyspace_size).toString()
		    result = await bench.readDataPrivate(key)
		}
		else if (args.method == "writeMuchData" && args.mode == "public"){
			let len = args.arg.toString()
			let start = (Math.floor(Math.random() * keyspace_size) - args.arg).toString()
		    let delta = (Math.floor(Math.random() * valuespace_size).toString())
            result = await bench.writeMuchDataPublic(len, start, delta)
		}
		else if (args.method == "writeMuchData" && args.mode == "private"){
			let len = args.arg.toString()
			let start = (Math.floor(Math.random() * keyspace_size) - args.arg).toString()
		    let delta = (Math.floor(Math.random() * valuespace_size).toString())
            result = await bench.writeMuchDataPrivate(len, start, delta)
		}
		else if (args.method == "writeMuchData2" && args.mode == "public"){
			let len = args.arg.toString()
			let start = (Math.floor(Math.random() * keyspace_size) - args.arg).toString()
		    let delta = (Math.floor(Math.random() * valuespace_size).toString())
            result = await bench.writeMuchDataPublic2(len, start, delta)
		}
		else if (args.method == "writeMuchData2" && args.mode == "private"){
			let len = args.arg.toString()
			let start = (Math.floor(Math.random() * keyspace_size) - args.arg).toString()
		    let delta = (Math.floor(Math.random() * valuespace_size).toString())
            result = await bench.writeMuchDataPrivate2(len, start, delta)
		}
		else if (args.method == "readMuchData" && args.mode == "public"){
			let len = args.arg.toString()
		    let start = (Math.floor(Math.random() * (keyspace_size-len)).toString())
            result = await bench.readMuchDataPublic(len, start)
		}
		else if (args.method == "readMuchData" && args.mode == "private"){
			let len = args.arg.toString()
		    let start = (Math.floor(Math.random() * (keyspace_size-len)).toString())
            result = await bench.readMuchDataPrivate(len, start)
		}
		else if (args.method == "readMuchData2" && args.mode == "public"){
			let len = args.arg.toString()
		    let start = (Math.floor(Math.random() * (keyspace_size-len)).toString())
            result = await bench.readMuchDataPublic2(len, start)
		}
		else if (args.method == "readMuchData2" && args.mode == "private"){
			let len = args.arg.toString()
		    let start = (Math.floor(Math.random() * (keyspace_size-len)).toString())
            result = await bench.readMuchDataPrivate2(len, start)
		}
		else if (args.method == "measurePutState") {
            let key = Math.floor(Math.random() * keyspace_size).toString()
            let value = randomValueHex(args.val_size);
            result = await bench.measurePutState(key, value, args.arg);
            console.log(result);
        }
		else if (args.method == "sendZether") {
			result = await bench.sendZether()
		}
		//else if (args.method == "createWallet") {
		//	result = await bench.createWallet("wallet" + Math.floor(Math.random() * keyspace_size).toString())
		//}
		else if (args.method == "establishConnection") {
			const invitorName = "wallet" + Math.floor(Math.random() * 100)
			const inviteeName = "wallet" + Math.floor(Math.random() * 100)
			console.log("Establishing a connection between " + invitorName + " and " + inviteeName)
			result = await bench.establishConnection(invitorName, inviteeName)
		}
		else if (args.method == "issueCredential") {
			result = await bench.issueCredential()
		}
		else if (args.method == "makePresentation") {
			result = await bench.makePresentation()
		}
		else if (args.method == "createWallet") {
			result = await bench.createWallet()
		}
		else if (args.method == "writeDID") {
			result = await bench.writeDID()
		}
		else if (args.method == "registerDID") {
			result = await bench.registerDID()
		}
		else if (args.method == "readDID") {
			result = await bench.readDID()
		}
		else if (args.method == "writeAttrib") {
			result = await bench.writeAttrib()
		}
		else if (args.method == "readAttrib") {
			result = await bench.readAttrib()
		}
		else if (args.method == "writeSchema") {
			result = await bench.writeSchema()
		}
		else if (args.method == "readSchema") {
			result = await bench.readSchema()
		}
		else if (args.method == "writeCredDef") {
			result = await bench.writeCredDef()
		}
		else if (args.method == "readCredDef") {
			result = await bench.readCredDef()
		}
		else if (args.method == "writeRevRegDef") {
			result = await bench.writeRevRegDef()
		}
		else if (args.method == "readRevRegDef") {
			result = await bench.readRevRegDef()
		}
		else if (args.method == "writeRevRegDelta") {
			result = await bench.writeRevRedDelta()
		}
		else if (args.method == "readRevRegDelta") {
			result = await bench.readRevRegDelta()
		}
		else if (args.method == "mixed") {
            let ind = Math.floor(Math.random() * 100);
            if (ind < 100-40/8) {
            	result = await bench.readSchema();
			} else {
				result = await bench.writeSchema();
			}
		}

		else{throw("No valid method or mode chosen")}
		count++
		//save the timestamp of the receiving process and whether the execution was performed successfully
		logEntry[1] = Date.now()
		logEntry[2] = result

	} catch (err) {
		console.log("Error caught - writing -1")
		count++
		//save the timestamp of the receiving process and whether the execution was performed successfully
		logEntry[1] = Date.now()
		logEntry[2] = "-1"
		console.error(err)
	}
	logs.push(logEntry)
	if (count == totalCount){
		try {
			console.log("All requests sent on worker " + n + " - saving file");
			csvFromArrayOfArrays = converter.convertArrayToCSV(logs, {separator: " "});
			await writeFileAsync(__dirname + "/benchmarking_worker" + process.pid + ".csv", csvFromArrayOfArrays);
			console.log("file saved for worker " + n + " - all promises resolved")
			await bench.close(n)
			return process.exit(0);
		} catch (err) {
			console.log(err);
			return process.exit(0);
		}
	}
}


async function test_smooth(bench, n) {

	if (n/(numCPUs*worker_frequency)*1000 < slotDuration*1000) {
		let delta = 1000 / worker_frequency
		for (let i = 0; i < totalNumberPerSlot; i++) {
			console.log("Setting timeout of " + (n / (numCPUs * worker_frequency) * 1000 + i * delta) + " for worker " + n + ", the smooth way")
			setTimeout(helper, n / (numCPUs * worker_frequency) * 1000 + i * delta, bench, n)
		}
	} else {
		try {
			csvFromArrayOfArrays = converter.convertArrayToCSV(logs, {separator: " "})
			await writeFileAsync(__dirname + "/benchmarking_worker" + process.pid + ".csv", csvFromArrayOfArrays);
			console.log("empty file saved - no transactions to be sent on worker " + n);
			await bench.close(n);
			return;
		} catch(err) {
			console.log(err);
		};
	}
}


async function test_step(bench, n) {

	for (let i = 0; i < slotDuration; i++){
		let j;
		for (j = Math.floor(worker_frequency * i); j < worker_frequency * (i + 1) - 1; j++) {
			setTimeout(helper, i * 1000, bench, n)
		}
	}
}


async function test_ramp(bench, n, i) {

	console.log("Worker frequency: " + worker_frequency)
	console.log("Total duration: " + totalDuration)
	console.log("Slot duration: " + slotDuration)
	console.log("i: " + i)

	let lowerBound = worker_frequency/(2*totalDuration) * ((i + 0) * slotDuration)**2
	let upperBound = worker_frequency/(2*totalDuration) *  ((i + 1) * slotDuration)**2
	console.log("Lower bound: " + lowerBound)
	console.log("Upperbound:" + upperBound)

	for (let j = 0; j < upperBound; j++) {
		console.log("Setting timeout of " + Math.sqrt((2 * totalDuration * j) / (worker_frequency)) * 1000)
		setTimeout(helper, Math.sqrt((2 * totalDuration * j) / (worker_frequency)) * 1000, bench, n)
	}

}

async function test_fluctuate(bench, n) {

	//the number of different, independent slots of constant frequency
	let granularity = 20
	//the average number of requests within such a slot
	let expectation = worker_frequency * slotDuration / granularity

	for (let i = 0; i < granularity; i++) {
		//the random number of requests within this slot
		let nr = Math.round(expectation + (0.5 - Math.random()) * expectation)
		//the time difference between two transactions in this slot
		let delta = slotDuration / (granularity * nr) * 1000

		for (let j = 0; j < nr - 0.5; j++) {
			setTimeout(helper, n / (numCPUs / delta) + j * delta + i * slotDuration / granularity * 1000, bench, n)
		}
	}
}



async function main(n) {

	let bench = new Bench();

	await bench.init(n).catch(err => {console.log(err)})
	console.log("Setting a timeout on tx data on worker " + n + ": " + timeout*1000 + "ms");
	setTimeout(async function() {
		csvFromArrayOfArrays = converter.convertArrayToCSV(logs, {separator: " "})
		try {
		    await writeFileAsync(__dirname + "/benchmarking_worker" + process.pid + ".csv", csvFromArrayOfArrays);
		    console.log("file saved for worker " + n + " - time is up after " + (Date.now()-start).toString() + "ms, " + count + " out of " + totalNumberPerSlot + "transactions have come back");
			await bench.close(n);
			return process.exit(0);
		} catch(err) {
			console.log(err);
		};
	}, timeout*1000);

	if (args.shape == "smooth") {
		for (let i = 0; i < numberOfSlots; i++) {
		    setTimeout(test_smooth, i * slotDuration * 1000, bench, n)
		}

	} else if (args.shape == "step") {
		for (let i = 0; i < numberOfSlots; i++) {
			setTimeout(test_step, i * slotDuration * 1000, bench, n)
		}

	} else if (args.shape == "ramp") {
		console.log("number of Slots: " + numberOfSlots)
		for (let i = 0; i < numberOfSlots; i++) {
			console.log("Calling test_tramp");
			console.log("slotDuration:" + slotDuration)
			setTimeout(test_ramp, i * slotDuration * 1000, bench, n, i)
		}
		for (let i = 0; i < numberOfSlots; i++) {
		    setTimeout(test_smooth_no_timeout, numberOfSlots * slotDuration * 1000, bench, n)
		}


	} else if (args.shape == "fluctuate") {
		for (let i = 0; i < numberOfSlots; i++) {
			setTimeout(test_fluctuate, i * slotDuration * 1000, n)
		}
	}
}

//main function
if (cluster.isMaster) {
    console.log("Master " + process.pid + " is running");

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log("worker " + worker.process.pid + " died");
    });
} else {
    console.log("Worker " + cluster.worker.id + " resp. " +  process.pid + " started");
    console.log("\nWorker:")
	console.log(cluster.worker.id)
    main(cluster.worker.id - 1)
}

async function test_smooth_no_timeout(bench, n) {

	totalDuration = 2 * totalDuration;
	totalCount= 2 * totalCount;
	let delta = 1000 / worker_frequency;
	for (let i = 0; i < totalNumberPerSlot; i++) {
		console.log("Setting timeout on smooth of " + n / (numCPUs * worker_frequency) * 1000 + i * delta);
		setTimeout(helper, n / (numCPUs * worker_frequency) * 1000 + i * delta, bench, n);
	}

}