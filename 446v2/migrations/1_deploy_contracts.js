// requiring the contract
//var DisasterRecoveryTraining = artifacts.require("./DisasterRecoveryTraining");
//const DisasterRecoveryTraining = artifacts.require("DisasterRecoveryTraining");
const DisasterRecoveryTraining = artifacts.require("./DisasterRecoveryTraining.sol");
// exporting as module 
 module.exports = function(deployer) {
  deployer.deploy(DisasterRecoveryTraining, web3.utils.toWei("0.01", "ether"));
 };
 

