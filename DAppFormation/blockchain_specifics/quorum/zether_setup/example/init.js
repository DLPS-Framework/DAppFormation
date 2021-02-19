const config = require("./config.json")
const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider(config.node);
const web3 = new Web3(provider);

const Deployer = require('./deployer.js');

const run = async () => {

    const accounts = await web3.eth.getAccounts();
    console.log(accounts[0]);
    var deployer = new Deployer(accounts);

    let result = await deployer.mintCashToken(10000000)
    console.log("Minting 1000 Cash token");
    console.log(result)
    result = await deployer.approveCashToken(10000000);
    console.log("Approving 1000 Cash token");
    console.log(result)
}

run().catch(console.error);
