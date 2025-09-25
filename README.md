#  Disaster Recovery Training DApp

A decentralized application (DApp) built using **Solidity**, **Truffle**, and **Node.js** for simulating and managing disaster recovery training exercises on the Ethereum blockchain.  
This project demonstrates how blockchain can ensure **transparency, security, and immutability** in training records and recovery simulations.

---

## 📖 Table of Contents
1. [Features](#-features)  
2. [Project Structure](#-project-structure)  
3. [Requirements](#-requirements)  
4. [Installation](#️-installation)  
5. [Compile Contracts](#-compile-contracts)  
6. [Deploy (Migrate) Contracts](#-deploy-migrate-contracts)  
7. [Run Tests](#-run-tests)  
8. [Run Frontend](#-run-frontend)  
9. [Interacting with Smart Contracts](#-interacting-with-smart-contracts)  
10. [Developer Workflow](#-developer-workflow)  
11. [Troubleshooting](#-troubleshooting)  
12. [License](#-license)  
13. [Acknowledgements](#-acknowledgements)  

---

## Features
- Smart contract: `DisasterRecoveryTraining.sol`  
- Blockchain-backed training and record management  
- Deployment automation via **Truffle migrations**  
- Local blockchain support (Ganache / Hardhat)  
- Automated testing using **Mocha/Chai**  
- Frontend served with BrowserSync for rapid development  

---

## Project Structure

446v2/
├── contracts/                # Solidity smart contracts
│   └── DisasterRecoveryTraining.sol
├── migrations/               # Deployment scripts
│   └── 1_deploy_contracts.js
├── test/                     # Test files (Mocha/Chai)
├── package.json              # Node.js dependencies
├── truffle-config.js         # Truffle configuration
├── bs-config.json            # BrowserSync config
└── LICENSE                   # License file

---

## 📋 Requirements
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or above recommended)
- [Truffle](https://trufflesuite.com/truffle/)
- [Ganache](https://trufflesuite.com/ganache/) (or Hardhat)
- [MetaMask](https://metamask.io/) (for frontend interaction)

---

## Installation
Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd 446v2
npm install
```
## Compile Contracts
Compile the Solidity contracts into build artifacts:

```bash
truffle compile
```
##  Deploy (Migrate) Contracts

```bash
truffle migrate --reset
```
To deploy on a testnet (e.g., Ropsten, Goerli), configure truffle-config.js with your Infura/Alchemy key and run:

```bash
truffle migrate --network goerli
```
##Run Tests

Run automated tests written with Mocha/Chai:

```bash
truffle test
```
## Run Frontend

The project uses BrowserSync for frontend development

```bash
npm run dev
```
This will start a local dev server and open the DApp in your browser.

## Interacting with Smart Contracts

Using Truffle Console

After deploying, enter the Truffle console:

```bash
truffle console
```
Inside the console, you can interact with your contract:

```bash
// Get deployed contract
let instance = await DisasterRecoveryTraining.deployed();

// Call a function (example)
await instance.startTraining("Earthquake Drill", { from: accounts[0] });

// Read data
let trainingCount = await instance.getTrainingCount();
console.log(trainingCount.toString());
```

Using Web3.js

You can also interact from Node.js:

```bash
const Web3 = require("web3");
const contract = require("./build/contracts/DisasterRecoveryTraining.json");

const web3 = new Web3("http://127.0.0.1:7545");
const networkId = await web3.eth.net.getId();
const deployedNetwork = contract.networks[networkId];
const instance = new web3.eth.Contract(contract.abi, deployedNetwork.address);

await instance.methods.startTraining("Flood Simulation").send({ from: accounts[0] });
```
## Developer Workflow

- Write or update contracts in /contracts/
- Recompile with truffle compile
- Deploy using truffle migrate --reset
- Test with truffle test
- Run frontend with npm run dev
- Interact via Truffle console or Web3

## Troubleshooting
- Contracts not deploying?
Ensure Ganache (or your chosen network) is running.
-	MetaMask not connecting?
Add a custom RPC pointing to your local blockchain.
-	npm run dev not working?
Make sure BrowserSync is installed (npm install -g browser-sync).

## License

This project is licensed under the terms of the MIT License.

## Acknowledgements

	•	Truffle Suite
	•	Ethereum
	•	Ganache
	•	Node.js






