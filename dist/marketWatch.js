'use strict';

const BucketStats = require( __dirname + "/libs/BucketStats.js" );
const F = require( __dirname + "/libs/Functional.js" );
const watch = new BucketStats(1100, '0x11be'); // fake registry address...

//MAIN
watch.selectMarket('TKA').then( () => 
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

