'use strict';

const CastIronAPI = require(__dirname + '/CastIronAPI.js');
class PriceFeedElevenB extends PriceFeedBase {
	// mocked constructor arguments, please update as needed
	constructor(networkID, registryAddress) {
		super();
		this.networkID = networkID;
		this.registryAddress = registryAddress;

		_initialiseProps.call(this);
	}

	
}

var _initialiseProps = function () {
	this.totalBuckets = 11;
	this.medianBucket = 6;
	this.volumeIndex = 0;
	this.priceIndex = 3;
	this.supplyIndex = 2;
	this.ciapi = new CastIronAPI(this.networkID, this.registryAddress);

  // To find a median for an array of big numbers, need array's length to be bigner than 0. TODO: refactor this to be more robust to deal with wrong input
	this.median = arr => {
		let median = 0;
		let length = arr.length;
		if (length % 2 == 0) {
			median = arr[length / 2 - 1].plus(arr[length / 2]).div(2);
		} else {
			median = arr[(length - 1) / 2];
		}
		return median;
	};


	this.priceFromVolume = token => {
		let priceVolume = 0;
		let totalVolume = 0;
		for (let i = 1; i <= totalBuckets; i++) {
			priceVolume = ciapi.B[token].marketSummary(i)[priceIndex].mul(ciapi.B[token].marketSummary(i)[volumeIndex]).plus(priceVolume);
			totalVolume = ciapi.B[token].marketSummary(i)[volumeIndex].plus(totalVolume);
		}

		if (totalVolume && "0" != ciapi.web3.toDecimal(totalVolume)) {
			priceVolume = priceVolume.div(totalVolume);
		} else {
			priceVolume = ciapi.B[token].marketSummary(medianBucket)[priceIndex];
		}
		return priceVolume;
	};

	this.priceFromSupply = token => {
		let priceSupply = 0;
		let pricesSupply = [];
		for (let i = 1; i <= totalBuckets; i++) {
			if (ciapi.B[token].marketSummary(i)[supplyIndex] && !ciapi.B[token].marketSummary(i)[supplyIndex].equals(0)) {
				pricesSupply.push(ciapi.B[token].marketSummary(i)[priceIndex]);
			}
		}

		if (pricesSupply.length == 0) {
			priceSupply = ciapi.B[token].marketSummary(medianBucket)[priceIndex];
		} else {
			priceSupply = median(pricesSupply);
		}
		return priceSupply;
	};

	this.newPrice = token => {
		let newPrice = priceFromSupply(token).plus(priceFromVolume(token)).div(2);
		return newPrice;
	};
};

module.exports = PriceFeeds;
