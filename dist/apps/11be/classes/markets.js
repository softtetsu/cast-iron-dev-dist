'use strict';

// TODO: 
// Registry (for token market) is yet to be developed...
const JobQueue = require( __dirname + '/../../core/JobQueue.js');

const StandardToken = require( __dirname + '/../../build/contracts/StandardToken.json' );
const BucketObj     = require( __dirname + '/../../build/contracts/Buckets.json' );
const BKDBIObj      = require( __dirname + '/../../build/contracts/BucketDB.json' );
//const RegistryObj   = require( __dirname + '/contracts/MarketRegistry.json' ); // eventually ...

// EIP20 standard contract ABI conditions
const TokenSanity     = require( __dirname + '/../../core/conditions/Token/Sanity.js' ); // auto mapping from contract ABI
const TokenFulfill    = require( __dirname + '/../../core/conditions/Token/Fulfill.js' ); // auto mapping from contract ABI

// 11be specific conditions
const ExchangeSanity  = require( __dirname + '/conditions/Exchange/Sanity.js' ); // auto mapping from contract ABI
const ExchangeFulfill = require( __dirname + '/conditions/Exchange/Fulfill.js' ); // auto mapping from contract ABI

// 11be DB contract is only callable by Exchange contract. 
// It is only useful for others to call its constant functions for read-only access.
// Thus, its conditions will always returns "true" for constant functions and "false" 
// for any other functions... 
const DatabaseConstant  = require( __dirname + '/conditions/Database/Constant.js' ); // auto mapping from contract ABI

// We will also have conditions for registry contract... when we get there... 
//const RegistrySanity  = require( __dirname + '/conditions/Registry/Sanity.js' ); // auto mapping from contract ABI
//const RegistryFulfill = require( __dirname + '/conditions/Registry/Fulfill.js' ); // auto mapping from contract ABI

// App specific object combines all conditions
const allConditions   = {...TokenSanity, ...ExchangeSanity, ...TokenFulfill, ...ExchangeFulfill, ...DatabaseConstant};

//Main class
class Exchanges extends JobQueue {
	constructor(networkID, registryAddress) {
		super(networkID);

		this.registry  = this.web3.toAddress(registryAddress); // check for valid address

		this.TokenABI  = this.web3.eth.contract(StandardToken.abi);
		this.BucketABI = this.web3.eth.contract(BucketObj.abi);
		this.BKDBIABI  = this.web3.eth.contract(BKDBIObj.abi);
		// eventually with the following ...
		// this.RegistryABI = this.web3.eth.contract(RegistryObj.abi);

		// This app has three ABI types: 'Token', 'Exchange', and 'Database', (Registry will be added soon)
		this.CUE['Token'] = {}; this.CUE['Exchange'] = {}; this.CUE['Database'] = {}; //this.CUE['Registry'] = {};

		Object.keys(allConditions).map((f) => { if(typeof(this[f]) === 'undefined') this[f] = allConditions[f] });
	}

	tokenInfo = tokenSymbol => 
	{
		// Mocked token registry records ... the actual on-chain contract could look different.
		const mocked_records = 
		{
			'TKA': { 'TokenContract': '0x1c073e54aa2def345553165517094ea721b6df67',
                                 'Name': 'Trade Token A',
                                 'ExchangeContract': '0x1b7d5e77d84a86d65baaeb406bde88553cf02952',
                                 'since': 118000 },  
			'TKB': {'TokenContract': '0x', 'Name': 'Trade Token B', 'ExchangeContract': '0x', 'since': 119000 }, 
			'TKC': {'TokenContract': '0x', 'Name': 'Trade Token C', 'ExchangeContract': '0x', 'since': 100000 } 
		};

		// since the records are mocked, the function here is also completely mocked.
		// the real function that interact with smart contract should look very different
		if (typeof(mocked_records[tokenSymbol]) === 'undefined') {
			// mimicing smart contract returns when undefined
			return { [tokenSymbol]: {'TokenContract': '0x', 'Name': '', 'ExchangeContract': '0x', 'since': 0} }; 
		} else {
			return mocked_records[tokenSymbol];
		}
	}

	hotGroups = tokenList =>
        {
                let rc = tokenList.map( (token) =>
                {
                        let record = this.tokenInfo(token);


                        this.CUE.Exchange[token] = this.BucketABI.at(record.ExchangeContract);
                        this.CUE.Database[token] = this.BKDBIABI.at(this.CUE.Exchange[token].DB());

                        if (this.CUE.Database[token].exchange() != this.CUE.Exchange[token].address) {
                                throw new Error(`Token ${token} has Mismatching address between registry and contract`);
                        }

                        this.CUE.Token[token] = this.TokenABI.at(record.TokenContract);

                        return true;
                });

                return rc.reduce((result, stat) => { return result && (stat === true) });
        }

	// Note: 11be specific
        addrTokenBalance = tokenSymbol => addr =>
        {
                if (typeof(this.CUE.Token[tokenSymbol]) === 'undefined') throw new Error(`Token ${tokenSymbol} is not part of current hot group`);
                return this.web3.toDecimal(this.CUE.Token[tokenSymbol].balanceOf(addr).dividedBy(this.CUE.Exchange[tokenSymbol].atoken()));
        }

        addrStates = (tokenSymbol, bucketNo) => addr => {
                if (typeof(this.CUE.Token[tokenSymbol]) === 'undefined') throw new Error(`Token ${tokenSymbol} is not part of current hot group`);

                let [hot, owe, canceled, ...BNs] = this.CUE.Database[tokenSymbol].sellerStat(bucketNo, {from: addr}).reverse();
                let [earnings, sold, stock, no] = BNs.map((i) => { return this.web3.toDecimal(i); });
                let eb = this.addrEtherBalance(addr); // via super
                let tb = this.addrTokenBalance(tokenSymbol)(addr); 

                console.log(`DEBUG: - seller address ${addr} owe: ${owe}, earning: ${this.web3.toDecimal(this.web3.fromWei(earnings, 'ether'))} ethers`);

                return {hot, owe, earnings, sold, stock, no, eb, tb, addr, canceled, bucketNo};
        }

        closerStates = tokenSymbol => addr => {
                if (typeof(this.CUE.Token[tokenSymbol]) === 'undefined') throw new Error(`Token ${tokenSymbol} is not part of current hot group`);

                let [since, seen, cc, times, done, reward] = this.CUE.Exchange[tokenSymbol].closerStat({from: addr}).map((i) => { return this.web3.toDecimal(i); });

                console.log(`DEBUG: - closer address ${addr}, reward: ${this.web3.toDecimal(this.web3.fromWei(reward, 'ether'))} ethers`);

                return {since, seen, cc, times, done, reward, addr};
        }

}

module.exports = Exchanges;
