// Loading CastIron, connect to privnet, networkID: 1100
const CastIron = require( __dirname + "/libs/CastIronAPI.js");
const F = require( __dirname + "/libs/Functional.js");
const ciapi = new CastIron(1100, '0x11be');

// randomly picked addresses as makers / closers
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

// Local helper functions, may be included into Cast-Iron if proved to be useful...

const updatePasses = passes => addrObj => { passes[addrObj.addr] = addrObj.passwd; return passes; }
const prepare = passwd => addr => { return {addr, passwd}; }
const randomBuyToken = Q => bucketNo => addr => {
        let eth = F.rand(1);
        console.log(`DEBUG: buyer ${addr} buying ${eth} from bucket ${bucketNo}`);
        ciapi.buyToken(Q)(bucketNo, eth)(addr);

        return addr;
}

// Token contract owner (demo / test only)
// Also the exchange owner ( can call oracle callback (demo / test only)
let issuer = ciapi.web3.eth.accounts[0];

// should come from DOM
let pw = 'dc384ZU@b9lab';

// MAIN
ciapi.selectMarket('TKA').then(() => 
{

	// Information display
	let title =
		"\n########################################################################################"
	      + "\n\n\t11BE Test Contract addr: "
	      + ciapi.B.address
	      + "\n\t11BE Trading Token addr: "
	      + ciapi.T.address
	      + "\n\t\t   Token Issuer: "
	      + issuer
	      + "\n\t\t      Remaining: "
	      + ciapi.T.balanceOf(issuer)
	      + "\n\t11BE Staking Token addr: "
	      + ciapi.BT.address
	      + "\n\t\t   Token Issuer: "
	      + issuer
	      + "\n\t\t      Remaining: "
	      + ciapi.BT.balanceOf(issuer)
	      + "\n\n########################################################################################\n";
	
	F.log(title);

	let bucketNumber = 10;
	let minStock  = ciapi.web3.toDecimal(ciapi.B.marketSummary(bucketNumber)[4]); // minPerStock (1 ether worth of tokens based on price)
	let giveStock = ciapi.web3.toDecimal(ciapi.B.marketSummary(bucketNumber)[4].mul(2)); // give twice of the minPerStock from issuer (demo/test only)
	let minDuty   = 10000000000; // 100 Bucks
	let income    = 1000000000000000; // 0.005 ether
	let minStake  = ciapi.web3.toDecimal(ciapi.B.dutyStake().plus(minDuty)); // minimum requires to close 10 times per duty, with stake holding (20000 BUCKS)

	// Airdrop either TKA or BUCK when necessary
	// Since this is for demo only, we don't need to worry about standardize these flow
	ciapi.prepareQ().then((Q) => 
	{
		F.log(`Job ID: ${Q}`);
		F.loopOver(randomgroup)(
			F.compose(
				ciapi.addrStates(bucketNumber),
		                ciapi.giveTokens(Q)(issuer, giveStock)
			),
			F.compose(
				ciapi.closerStates,
			        ciapi.giveStakes(Q)(issuer, minStake)
			)
		);
		ciapi.processQ(Q)({ [issuer]: pw });
	})
	
	// randomgroup members buy TKA token
	// BUY:
	// buyObj = {type: 'BUY', address: <addr>, token: <symbol>, bucket: <bucketNo>}
	// actual passed in queue is array of buyObj above: [buyObj1, buyObj2, ...]
	// this array will be passed in via prepareQ
	// password for specific account should be handled by password manager, 
	// will create mocked one for now.
	ciapi.prepareQ().then((Q) => 
	{
		let passes = {};
	
		F.log(`Job ID: ${Q}`);
		F.loopOver(randomgroup)(
			randomBuyToken(Q)(bucketNumber),
			prepare(pw),
			updatePasses(passes)
		);
		ciapi.processQ(Q)(passes);
	})
	
	// randomgroup members become TKA seller on 11BE, cash out when order filled
	ciapi.prepareQ().then((Q) => 
	{
		let passes = {};
	
		F.log(`Job ID: ${Q}`);
		F.loopOver(randomgroup)(
			F.compose(
				ciapi.addrStates(bucketNumber),
				ciapi.depositToken(Q)(minStock),
		                ciapi.checkOut(Q),
			),
			prepare(pw),
			updatePasses(passes)
		);
		ciapi.processQ(Q)(passes);
	}) 
	
	// randomgroup member becomes closers on 11BE for TKA market, perform closing.
	ciapi.prepareQ().then((Q) => 
	{
		let passes = {};
	
		F.log(`Job ID: ${Q}`);
		F.loopOver(randomgroup)(
	        	F.compose(
	                	ciapi.closerStates,
	        	        ciapi.depositStake(Q)(minDuty),
	        	),
			F.compose(
				ciapi.estimateClosing(bucketNumber, income),
				ciapi.closing(Q),
			),
			prepare(pw),
			updatePasses(passes)
		);
		ciapi.processQ(Q)(passes);
	})
	//.then( () => { return ciapi.closeIPC(); } ); // only the last one
})
