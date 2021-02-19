var CashToken = artifacts.require("./CashToken.sol");

module.exports = (deployer) => {
    deployer.deploy(CashToken);
}