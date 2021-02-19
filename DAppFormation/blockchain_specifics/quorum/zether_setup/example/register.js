
const config = require("./config.json")
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider(config.node);
const web3 = new Web3(provider);

const Client = require("../anonymous.js/src/client.js");
const ZSC = require("../protocol/build/contracts/ZSC.json");

const run = async () => {

    const deployed = new web3.eth.Contract(ZSC.abi, ZSC.networks['10'].address);
    console.log("Contract SSC: ")
    console.log(deployed)

    const alice = new Client(web3, deployed, config.account);
    await alice.register();
    console.log("Alice: " + alice.account.public());
    await alice.deposit(100000);
}

run().catch(console.error);
