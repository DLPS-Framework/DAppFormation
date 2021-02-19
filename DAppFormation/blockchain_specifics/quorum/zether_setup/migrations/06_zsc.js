var ZSC = artifacts.require("./ZSC.sol");
var CashToken = require("../build/contracts/CashToken.json")
var ZetherVerifier = require("../build/contracts/ZetherVerifier.json")
var BurnVerifier = require("../build/contracts/BurnVerifier.json")

module.exports = (deployer) => {
    deployer.deploy(ZSC, CashToken.networks['10'].address, ZetherVerifier.networks['10'].address, BurnVerifier.networks['10'].address, 6);
}