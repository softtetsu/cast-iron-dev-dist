'use strict';

const F = require(__dirname + "/Functional.js");
const Exchanges = require(__dirname + "/Exchanges.js");

class BucketStat extends Exchanges {
	constructor(networkID, registryAddress) {
		super(networkID, registryAddress);

		this.marketSummary = bucket => {
			let [bucketSold, bucketSettled, bucketSupply, currentPrice, minPerStock] = this.B.marketSummary(bucket).map(u => {
				return this.web3.toDecimal(u);
			});
			let revenue = this.web3.toDecimal(this.web3.fromWei(this.web3.toBigNumber(bucketSold).minus(bucketSettled).times(currentPrice), 'ether'));

			let stdouts = `\nMarketSummary (Bucket ${bucket}): \n---------------\n` + JSON.stringify({ bucketSold, bucketSettled, bucketSupply, currentPrice, minPerStock }, 0, 1) + `\nRevenue to be settled: ${revenue}`;

			F.log(stdouts);

			return bucket;
		};

		this.totalmarketSupply = () => {
			F.log(`\nTotal token supply: \n---------------\n` + this.web3.toDecimal(this.B.tokenSupply(0).dividedBy(this.B.atoken())));
		};

		this.marketFinance = bucket => {
			let [ethBalance, extraReward] = this.B.marketFinance(bucket).map(u => {
				return this.web3.toDecimal(this.web3.fromWei(u, 'ether'));
			});
			let stdouts = `\nMarket Finance (Bucket ${bucket}): \n---------------\n` + JSON.stringify({ ethBalance, extraReward }, 0, 1);

			F.log(stdouts);

			return bucket;
		};

		this.exchangeStatus = () => {
			let tradePaused = this.B.paused();
			let periodEnds = this.web3.toDecimal(this.B.periodEnds());
			let currentBlock = this.web3.eth.blockNumber;
			let priceUpdReward = this.web3.toDecimal(this.web3.fromWei(this.B.priceUpdateReward(), 'ether'));
			let exchangeFee = this.web3.toDecimal(this.web3.fromWei(this.B.exchangefee(), 'ether'));
			let marketBalance = this.web3.toDecimal(this.web3.fromWei(this.web3.eth.getBalance(this.B.address).minus(this.B.priceUpdateReward()).minus(this.B.exchangefee()), 'ether'));
			F.log(`\nExchange Status: \n---------------\n` + JSON.stringify({ currentBlock, periodEnds, tradePaused, priceUpdReward, exchangeFee, marketBalance }, 0, 1));
		};

		this.bucketLimits = bucket => {
			let [maxListing, peakListing, slotReused, slotSettled] = this.D.bucketLimits(bucket).map(u => {
				return this.web3.toDecimal(u);
			});
			F.log(`\nBucket Capasity Status (Bucket ${bucket}): \n---------------\n` + JSON.stringify({ maxListing, peakListing, slotReused, slotSettled }, 0, 1));

			return bucket;
		};
	}

};

module.exports = BucketStat;
