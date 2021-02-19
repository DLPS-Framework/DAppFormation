var BurnVerifier = artifacts.require("./BurnVerifier.sol");
var InnerProductVerifier = require("../build/contracts/InnerProductVerifier.json")

module.exports = (deployer) => {
    deployer.deploy(BurnVerifier, InnerProductVerifier.networks['10'].address);
}