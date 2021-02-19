const Web3 = require("web3");
const CashToken = require("../protocol/build/contracts/CashToken.json");
const ZSC = require("../protocol/build/contracts/ZSC.json");

const config = require("./config.json")

class Deployer {
    constructor(accounts) {
        const web3 = new Web3(new Web3.providers.HttpProvider(config.node))
        web3.transactionConfirmationBlocks = 1;

        this.mintCashToken = (amount) => {
            const contract = new web3.eth.Contract(CashToken.abi, CashToken.networks['10'].address);
            return new Promise((resolve, reject) => {
                contract.methods.mint(accounts[0], amount).send({ from: accounts[0], gas: 4700000 })
                    .on("receipt", (receipt) => {
                        contract.methods.balanceOf(accounts[0]).call()
                            .then((result) => {
                                // console.log("ERC20 funds minted (balance = " + result + ").");
                                resolve(receipt);
                            });
                    })
                    .on("error", (error) => {
                        reject(error);
                    });
            });
        };

        this.approveCashToken = (amount) => {
            const contract = new web3.eth.Contract(CashToken.abi, CashToken.networks['10'].address);
            return new Promise((resolve, reject) => {
                contract.methods.approve(ZSC.networks['10'].address, amount).send({ from: accounts[0], gas: 4700000 })
                    .on("receipt", (receipt) => {
                        contract.methods.allowance(accounts[0], ZSC.networks['10'].address).call()
                            .then((result) => {
                                // console.log("ERC funds approved for transfer to ZSC (allowance = " + result + ").");
                                resolve(receipt);
                            });
                    })
                    .on("error", (error) => {
                        reject(error);
                    });
            });
        };
    }
}

module.exports = Deployer;
