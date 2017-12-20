'use strict';

const F = require(__dirname + "/../../libs/Functional.js");
const Exchanges = require(__dirname + "/Exchanges.js");

class MarketStat extends Exchanges {
	constructor(networkID, registryAddress, tokenSymbol) {
		super(networkID, registryAddress);

		this.marketSummary = bucket => {
			let [bucketSold, bucketSettled, bucketSupply, currentPrice, minPerStock] = this.CUE.Exchange[this.tokenSymbol].marketSummary(bucket).map(u => {
				return this.web3.toDecimal(u);
			});

			let revenue = this.web3.toDecimal(this.web3.fromWei(this.web3.toBigNumber(bucketSold).minus(bucketSettled).times(currentPrice), 'ether'));

			let stdouts = `\nMarketSummary (Bucket ${bucket}): \n---------------\n` + JSON.stringify({ bucketSold, bucketSettled, bucketSupply, currentPrice, minPerStock }, 0, 1) + `\nRevenue to be settled: ${revenue}`;

			F.log(stdouts);

			return bucket;
		};

		this.totalmarketSupply = () => {
			F.log(`\nTotal token supply: \n---------------\n` + this.web3.toDecimal(this.CUE.Exchange[this.tokenSymbol].tokenSupply(0).dividedBy(this.CUE.Exchange[this.tokenSymbol].atoken())));
		};

		this.marketFinance = bucket => {
			let [ethBalance, extraReward] = this.CUE.Exchange[this.tokenSymbol].marketFinance(bucket).map(u => {
				return this.web3.toDecimal(this.web3.fromWei(u, 'ether'));
			});
			let stdouts = `\nMarket Finance (Bucket ${bucket}): \n---------------\n` + JSON.stringify({ ethBalance, extraReward }, 0, 1);

			F.log(stdouts);

			return bucket;
		};

		this.exchangeStatus = () => {
			let tradePaused = this.CUE.Exchange[this.tokenSymbol].paused();
			let periodEnds = this.web3.toDecimal(this.CUE.Exchange[this.tokenSymbol].periodEnds());
			let currentBlock = this.web3.eth.blockNumber;
			let priceUpdReward = this.web3.toDecimal(this.web3.fromWei(this.CUE.Exchange[this.tokenSymbol].priceUpdateReward(), 'ether'));
			let exchangeFee = this.web3.toDecimal(this.web3.fromWei(this.CUE.Exchange[this.tokenSymbol].exchangefee(), 'ether'));
			let marketBalance = this.web3.toDecimal(this.web3.fromWei(this.web3.eth.getBalance(this.CUE.Exchange[this.tokenSymbol].address).minus(this.CUE.Exchange[this.tokenSymbol].priceUpdateReward()).minus(this.CUE.Exchange[this.tokenSymbol].exchangefee()), 'ether'));
			F.log(`\nExchange Status: \n---------------\n` + JSON.stringify({ currentBlock, periodEnds, tradePaused, priceUpdReward, exchangeFee, marketBalance }, 0, 1));
		};

		this.bucketLimits = bucket => {
			let [maxListing, peakListing, slotReused, slotSettled] = this.CUE.Database[this.tokenSymbol].bucketLimits(bucket).map(u => {
				return this.web3.toDecimal(u);
			});
			F.log(`\nBucket Capasity Status (Bucket ${bucket}): \n---------------\n` + JSON.stringify({ maxListing, peakListing, slotReused, slotSettled }, 0, 1));

			return bucket;
		};

		this.hotGroups([tokenSymbol]);
		this.tokenSymbol = tokenSymbol;
	}

};

module.exports = MarketStat;
