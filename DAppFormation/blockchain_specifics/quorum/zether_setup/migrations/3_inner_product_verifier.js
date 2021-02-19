var InnerProductVerifier = artifacts.require("./InnerProductVerifier.sol");

module.exports = (deployer) => {
    deployer.deploy(InnerProductVerifier);
}