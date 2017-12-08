'use strict';

// TODO: 
//
// Should use this to create Wrap3 subclass that handles 
// token registry, token and exchange contract bindings, 
// and any other token or exchange specific functions.
//
// Should be parent for CastIronAPI, and BucketStat.

const Wrap3 = require(__dirname + '/Wrap3.js');

const StandardToken = require(__dirname + '/../build/contracts/StandardToken.json');
const BucketObj = require(__dirname + '/../build/contracts/Buckets.json');
const BKDBIObj = require(__dirname + '/../build/contracts/BucketDB.json');
// const RegistryObj = require( __dirname + '/contracts/MarketRegistry.json' ); // eventually ...

class Exchanges extends Wrap3 {
	constructor(networkID, registryAddress) {
		super(networkID);

		this.tokenInfo = tokenSymbol => {
			// Mocked token registry records ... the actual on-chain contract could look different.
			const mocked_records = {
				'TKA': { 'TokenContract': '0x1c073e54aa2def345553165517094ea721b6df67',
					'Name': 'Trade Token A',
					'ExchangeContract': '0x1b7d5e77d84a86d65baaeb406bde88553cf02952',
					'since': 118000 },
				'TKB': { 'TokenContract': '0x', 'Name': 'Trade Token B', 'ExchangeContract': '0x', 'since': 119000 },
				'TKC': { 'TokenContract': '0x', 'Name': 'Trade Token C', 'ExchangeContract': '0x', 'since': 100000 }
			};

			// since the records are mocked, the function here is also completely mocked.
			// the real function that interact with smart contract should look very different
			if (mocked_records.hasOwnProperty(tokenSymbol) == false) {
				// mimicing smart contract returns when undefined
				return { [tokenSymbol]: { 'TokenContract': '0x', 'Name': '', 'ExchangeContract': '0x', 'since': 0 } };
			} else {
				return mocked_records[tokenSymbol];
			}
		};

		this.selectMarket = tokenSymbol => {
			// Before we change the inputs for processQ, here we will temporarily 
			// use the B and T attributes ... this should be fixed by passing local
			// variables of the contract bindings into processQ (again, via prepareQ)
			//
			// This also means soon Cast-Iron should have many queuing functions requiring
			// caller to provide both exchange and token contract addresses.
			//
			// In short, the implementation here merely trying to demonstrate how the
			// function works using existing code contexts. It is not intended to be real
			// solution.
			const __enterShop = (resolve, reject) => {
				let tokenData = this.tokenInfo(tokenSymbol);

				// since this function is called "selectMarket", it should only be selected
				// in this function if not selected yet. All previous queue job should reset
				// this.B back to null.
				if (this.B != null || this.D != null || this.T != null) {
					setTimeout(() => __enterShop(resolve, reject), 500);
				} else if (tokenData.since === 0) {
					reject(`Invalid or unregistered token ${tokenSymbol}`);
				} else {
					this.B = this.BucketABI.at(tokenData.ExchangeContract);
					this.D = this.BKDBIABI.at(this.B.DB());

					if (this.D.exchange() != tokenData.ExchangeContract) {
						reject(`Token: ${tokenSymbol} has Mismatching address between registry and contract`);
					}

					// Here we just use standard ERC20 ABI
					this.T = this.TokenABI.at(tokenData.TokenContract);

					resolve(true);
				}
			};

			return new Promise(__enterShop);
		};

		this.registry = this.web3.toAddress(registryAddress); // check for valid address
		// eventually with the following ...
		// this.RegistryABI = this.web3.eth.contract(RegistryObj.abi);
		// this.R = this.RegistryABI.at(this.registry); // Okay, Okay, single charachter names sucks ...

		this.TokenABI = this.web3.eth.contract(StandardToken.abi);
		this.BucketABI = this.web3.eth.contract(BucketObj.abi);
		this.BKDBIABI = this.web3.eth.contract(BKDBIObj.abi);

		this.B = null;this.D = null;this.T = null;
	}

	// This should return Promise which may be followed by processQ
	// It also means that all input here could be passed in via prepareQ
}

module.exports = Exchanges;
