'use strict';

const Exchange = require( __dirname + '/apps/11be/Exchanges.js');
const dq = new Exchange(1100, '0x11be'); // still using fake registry address
const F = require( __dirname + "/libs/Functional.js");

// Randomly picked addresses as makers / closers
const randomgroup =
[ '0x1cffc1b18636137366071d40cc42f5812b7951ae',
  '0x4a5f5381369d0af998a0ee053d0d412e47059b9b',
  '0x8f7a9d659f4d8a2e037441017bcf8911178d0a2c',
  '0x14888da7faa0da17b90faf1f0ae770a5c32ad66c',
  '0xd8134fc7ac1ba5111c9f7dc20125fea6373ab706',
  '0xbd7d68024ec3e21d64f06bab9aab26049a468f27',
  '0xc9d34cc8f37f9f40a2b83ae0c914f975a11a5db3',
  '0x82cf83bf410a0b41f23ab5c3b2e97223160b70d9',
  '0x119f26faf8e333cfdd3c1f2dc725aff30a9150a4' ];

// Before we finished Account Manager, this is used for demo / test purpose ...
const updatePasses = passes => addrObj => { passes[addrObj.addr] = addrObj.passwd; return passes; }
const prepare = passwd => addr => { return {addr, passwd}; }
const jobForAddr = jobObj => addr => { dq.enqueue(jobObj)(addr); return addr };

// Main
let TokenList = ['TKA']; // we need more trading tokens! ;)

if ( dq.hotGroups(TokenList) ) {
	dq.prepareQ(TokenList).then( (Q) =>
	{
		F.log(`Job ID: ${Q}`);

		// Token contract owner, price feed account, also the exchange owner (demo / test only)
		let issuer = dq.web3.eth.accounts[0];

		// should be handled by Account Manager
		let pw = 'dc384ZU@b9lab';
		let passes = {};

		F.loopOver([...randomgroup, issuer])(
			F.compose(
                        	prepare(pw),
                        	updatePasses(passes)
			)
                );

		// *Meta and tx* can and should be created by helper function in dq.
		// Their values vary depend on the smart contract function called.
		// CastIron API should provides all boilerplates as well as recommended 
		// values along with hotGroups call (initilization).
		// Note that Q is determined at prepareQ ...
		let tokenMeta = {Q, type: 'Token', contract: 'TKA'};
		let exchangeMeta = {Q, type: 'Exchange', contract: 'TKA'};
		let txTransfer = {gas: 180000, gasPrice: 9000000000};
		let txbuyStock = {gas: 300000, gasPrice: 9000000000};

		dq.condition = 'sanity';

		randomgroup.map( addr => 
		{
			// Here the actual transfer amount should be determined on-the-go ...
			// Should come from React / DOM
			let transferMeta = {call: 'transfer', args: ['addr', 'amount'], addr, amount: 1500000000000};
			let buyStockMeta = {call: 'buyStock', args: ['bucketNo'], bucketNo: 10};

			// Airdrop either TKA or BUCK when necessary (demo / test only)
			dq.enqueue( { ...tokenMeta, ...transferMeta, txObj: { ...txTransfer, from: issuer } } )(issuer);

			// Buy
			let eth = F.rand(1); 

			dq.enqueue({ ...exchangeMeta, ...buyStockMeta, txObj: { ...txbuyStock, from: addr, value: dq.web3.toWei(eth, 'ether') } } )(addr);
		});

		dq.processQ(Q)(passes);
	})
	.catch((err) => { console.log(err)});

}
