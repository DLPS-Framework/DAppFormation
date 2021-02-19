var ZetherVerifier = artifacts.require("./ZetherVerifier.sol");
var InnerProductVerifier = require("../build/contracts/InnerProductVerifier.json")

module.exports = (deployer) => {
    deployer.deploy(ZetherVerifier, InnerProductVerifier.networks['10'].address);
}