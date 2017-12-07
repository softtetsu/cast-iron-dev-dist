'use strict';

const Wrap3 = require( __dirname + "/libs/Wrap3.js");
const F     = require( __dirname + "/libs/Functional.js");

const BucketObj = require( __dirname + '/contracts/Buckets.json' );
const BKDBIObj  = require( __dirname + '/contracts/BucketDB.json' );

class BucketStat extends Wrap3 {
	constructor(networkID) {

		super(networkID);
		
		// Soon we'll introduce token registry layer.
		// By then, proper binding to exact exchange / DB contract which points to desired token (need to specify when calling constructor)
		// via its symbol will be added and necessary to properly finish contract binding.
		this.BucketLab = this.web3.eth.contract(BucketObj.abi);
                this.BKDBILab  = this.web3.eth.contract(BKDBIObj.abi);

		this.B  = this.BucketLab.at(BucketObj.networks[networkID].address);
                this.D  = this.BKDBILab.at(BKDBIObj.networks[networkID].address);

		this.issuer = this.web3.eth.accounts[0];
	}

	marketSummary = bucket => {
		F.log(`\nMarketSummary (Bucket ${bucket}): \n---------------`);
		let [bucketSold, bucketSettled, bucketSupply, currentPrice, minPerStock] = this.B.marketSummary(bucket).map((u) => { return this.web3.toDecimal(u) });
        	F.log({bucketSold, bucketSettled, bucketSupply, currentPrice, minPerStock});
		let revenue = this.web3.toDecimal(this.web3.fromWei(this.web3.toBigNumber(bucketSold).minus(bucketSettled).times(currentPrice), 'ether'));
		F.log(`\nRevenue to be settled: ${revenue}`);

		return bucket;
	}

	totalmarketSupply = () => {
		F.log("\nTotal token supply: \n---------------");
		F.log(this.web3.toDecimal(this.B.tokenSupply(0).dividedBy(this.B.atoken())));
	}

	marketFinance = bucket => {
		F.log(`\nMarket Finance (Bucket ${bucket}): \n---------------`);
		let [ethBalance, extraReward] = this.B.marketFinance(bucket).map((u) => { return this.web3.toDecimal(this.web3.fromWei(u, 'ether')); });

		F.log({ethBalance, extraReward});

		return bucket;
	}

	exchangeStatus = () => {
		console.log(`\nExchange Status: \n---------------`);
		let tradePaused = this.B.paused();
		let periodEnds = this.web3.toDecimal(this.B.periodEnds());
		let currentBlock = this.web3.eth.blockNumber;
		let priceUpdReward = this.web3.toDecimal(this.web3.fromWei(this.B.priceUpdateReward(), 'ether'));
		let exchangeFee = this.web3.toDecimal(this.web3.fromWei(this.B.exchangefee(), 'ether'));
		let marketBalance = this.web3.toDecimal(this.web3.fromWei(this.web3.eth.getBalance(this.B.address).minus(this.B.priceUpdateReward()).minus(this.B.exchangefee()), 'ether'));

		console.log({currentBlock, periodEnds, tradePaused, priceUpdReward, exchangeFee, marketBalance});
	}

	bucketLimits = bucket => {
		F.log(`\nBucket Capasity Status (Bucket ${bucket}): \n---------------`);
		let [maxListing, peakListing, slotReused, slotSettled] = this.D.bucketLimits(bucket).map((u) => { return this.web3.toDecimal(u)});
		F.log({maxListing, peakListing, slotReused, slotSettled});

		return bucket;
	}

};

module.exports = BucketStat; 
