'use strict';

const BucketStat = require( __dirname + "/BucketStat.js" );
const F = require( __dirname + "/libs/Functional.js" );
const watch = new BucketStat(1100);

let stage = Promise.resolve();

//MAIN
stage.then( () => {
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
