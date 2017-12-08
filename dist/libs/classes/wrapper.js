'use strict';

const Web3 = require('web3');
const net  = require('net');
const os   = require('os');
const path = require('path');

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
	}

	addrEtherBalance = addr => { return this.web3.toDecimal(this.web3.fromWei(this.web3.eth.getBalance(addr), 'ether')); }

	unlockViaIPC = passwd => addr => {
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

	closeIPC = () => {
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

	getReceipt = (txHash, interval) => {
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
}

module.exports = Wrap3;
