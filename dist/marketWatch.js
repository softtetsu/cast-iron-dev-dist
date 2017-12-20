'use strict';

const BucketStats = require( __dirname + "/apps/11be/MarketStats.js" );
const F = require( __dirname + "/libs/Functional.js" );
const watch = new BucketStats(1100, '0x11be', 'TKA'); // fake registry address...

//MAIN
let stage = Promise.resolve();
stage.then( () => 
{
	F.loopOver([6,10])(
		F.compose(
			watch.marketSummary,
			watch.marketFinance,
			watch.bucketLimits
		),
	);

	watch.exchangeStatus();
	watch.totalmarketSupply();
}).then(() => { watch.closeIPC() });

