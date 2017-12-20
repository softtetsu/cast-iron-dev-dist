'use strict';

const Web3 = require('web3');
const net  = require('net');
const os   = require('os');
const path = require('path');

// For web3.eth, "CUE" simply pointing to existing web3 functions.
// the reason to place them under "CUE" is to unify the job queue
// interface regardless the transaction is smart contract related 
// or not. Its "CUE" type is called "Web3"; "contract" is called
// "eth".
//
// web3.eth related conditions are imported with default setups, 
// similar to smart contracts.

const web3EthFulfill = require( __dirname + '/conditions/Web3/Fulfill.js' );
const web3EthSanity  = require( __dirname + '/conditions/Web3/Sanity.js' );
const allConditions  = { ...web3EthSanity, ...web3EthFulfill };

// Main Class
class Wrap3 {
	constructor(networkID)
	{
		this.rpcAddr = 'http://127.0.0.1:8545';
		this.ipcPath = path.join(os.homedir(), '.ethereum', 'geth.ipc');

		this.web3 = new Web3();
                this.web3.setProvider(new Web3.providers.HttpProvider(this.rpcAddr));

    		this.web3.toAddress = address => {
			let addr = String(this.web3.toHex(this.web3.toBigNumber(address)));

        		if (addr.length === 42) {
				return addr
			} else if (addr.length > 42) {
				throw "Not valid address";
			}

        		let pz = 42 - addr.length;
        		addr = addr.replace('0x', '0x' + '0'.repeat(pz));

        		return addr;
		};

    		this.ipc3 = new Web3();
    		this.ipc3.setProvider(new Web3.providers.IpcProvider(this.ipcPath, net));

		this.networkID = networkID;

		// this.CUE[type][contract][call](...args, txObj)
		// Only web3.eth.sendTransaction requires password unlock.
		this.CUE = { 'Web3': { 'eth': {'sendTransaction': this.web3.eth.sendTransaction } } };

		// ... Thus the conditions should only need to sanity check or fulfill this function
		Object.keys(allConditions).map( (f) => { if(typeof(this[f]) === 'undefined') this[f] = allConditions[f] } );
	}

	addrEtherBalance = addr => { return this.web3.toDecimal(this.web3.fromWei(this.web3.eth.getBalance(addr), 'ether')); }

	unlockViaIPC = passwd => addr => 
	{
                const __unlockToExec = (resolve, reject) => {
                        this.ipc3.personal.unlockAccount(addr, passwd, 12, (error, result) => {
                                if (error) {
                                        reject(error);
                                } else if (result != true) {
                                        setTimeout( () => __unlockToExec(resolve, reject), 500 );
                                } else {
                                        resolve(true);
                                }
                        });
                };

                return new Promise(__unlockToExec);
        }

	closeIPC = () => 
	{
                const __closeIPC = (resolve, reject) => {
                        if (this.ipc3 && this.ipc3.hasOwnProperty('net') == true) {
                                console.log("Shutdown ipc connection!!!");
                                resolve(this.ipc3.net._requestManager.provider.connection.destroy());
                        } else if (this.ipc3) {
                                console.log("Still pending to shutdown ipc connection!!!");
                                setTimeout( () => __closeIPC(resolve, reject), 500 );
                        } else {
                                console.log("Uh Oh...... (closeIPC)");
                                reject(false);
                        }
                };

                return new Promise(__closeIPC);
        }

	getReceipt = (txHash, interval) => 
	{
    		const transactionReceiptAsync = (resolve, reject) => {
        		this.web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
            			if (error) {
                			reject(error);
            			} else if (receipt == null) {
                			setTimeout( () => transactionReceiptAsync(resolve, reject), interval ? interval : 500);
            			} else {
                			resolve(receipt);
            			}
        		});
    		};

		if (Array.isArray(txHash)) {
        		return Promise.all( txHash.map(oneTxHash => this.getReceipt(oneTxHash, interval)) );
    		} else if (typeof txHash === "string") {
        		return new Promise(transactionReceiptAsync);
    		} else {
        		throw new Error("Invalid Type: " + txHash);
    		}
	}

	// txObj is just standard txObj in ethereum transaction calls
	gasCostEst = (addr, txObj) => 
	{
		if (
			txObj.hasOwnProperty('gas') == false
		     || txObj.hasOwnProperty('gasPrice') == false
		) { throw new Error("txObj does not contain gas-related information"); }

		let gasBN = this.web3.toBigNumber(txObj.gas);
                let gasPriceBN = this.web3.toBigNumber(txObj.gasPrice);
                let gasCost = gasBN.mul(gasPriceBN);

		return gasCost;
	}
}

module.exports = Wrap3;
