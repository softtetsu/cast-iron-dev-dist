'use strict';

const uuid = require('uuid/v4');
const Exchanges = require(__dirname + '/Exchanges.js');
const BucksObj = require(__dirname + '/../build/contracts/BucketToken.json');

// Main Class
class CastIron extends Exchanges {

	// Notes:
	// 1).
	// Flexible exchange / token / db contract access should be done by dedicated class method ( or even subclass ) that 
	// retrive information via official token market registry.
	//
	// 2).
	// Current changePrice() method is just for demonstration purpose, better design is needed
	// Maybe a simple data structure can be used to record stats of "last seen pause", "update sent", and "update applied",
	// all in block numbers.
	//
	// 3). 
	// buyToken() method may need small tweak to allow different way of specifying purchase. 
	// Do notice that buyStock on-chain function will calculate how many token to purchase based on msg.value
	// this is necessary design and won't change, Cast-Iron will accomodate additional user need off-chain.
	//
	// 4).
	// All gas amount and gas price here should eventually become class variables
	//
	// 5).
	// Future Cast-Iron should implement simple contract check before applying them, this can be done while being pointed to
	// specific market / token / db from registry. Check before apply.
	constructor(networkID, registryAddress) {
		super(networkID, registryAddress);

		// For now, BucketToken itself is still managed separatedly ...

		this.addrTokenBalance = addr => {
			return this.web3.toDecimal(this.T.balanceOf(addr).dividedBy(this.B.atoken()));
		};

		this.prepareQ = () => {
			const __initQueue = (resolve, reject) => {
				if (Object.keys(this.jobQ).length !== 0) {
					setTimeout(() => __initQueue(resolve, reject), 5000);
				} else {
					let myid = uuid();
					this.jobQ[myid] = {};

					resolve(myid);
				}
			};

			return new Promise(__initQueue);
		};

		this.enqueue = addr => jobObj => {
			let { Q, ...job } = jobObj;

			if (Q == undefined || this.jobQ.hasOwnProperty(Q) == false) {
				throw "Queue error (enqueue)";
			} else if (this.jobQ[Q].hasOwnProperty(addr) == false) {
				this.jobQ[Q][addr] = [];
			}

			this.jobQ[Q][addr].push(job);

			return true;
		};

		this.processQ = Q => passes => {
			if (Q == undefined || this.jobQ.hasOwnProperty(Q) == false) throw "Queue error (processQ)";

			let results = Promise.resolve();

			Object.keys(passes).map(addr => {
				if (this.jobQ[Q].hasOwnProperty(addr) == false || this.jobQ[Q][addr].length == 0) {
					delete Q[addr];
					return;
				}

				results = results.then(() => {
					return this.unlockViaIPC(passes[addr])(addr).then(() => {
						this.jobQ[Q][addr].map(o => {
							let tx = this[o.contract][o.call](...o.args, o.txObj);
							console.log(`QID: ${Q} | address: ${addr} doing ${o.call} on ${o.contract}, txhash: ${tx}`);
						});
					}).then(() => {
						this.ipc3.personal.lockAccount(addr, (e, r) => {
							if (e) throw e;
							console.log(`** account: ${addr} is now locked`);
							delete this.jobQ[Q][addr];
						});
					});
				}).catch(error => {
					console.log(error);
				});
			});

			results = results.then(this.closeQ(Q));

			return results;
		};

		this.closeQ = Q => {
			if (Q == undefined || this.jobQ.hasOwnProperty(Q) == false) throw "Queue error (closeQ)";

			const __closeQ = (resolve, reject) => {
				if (Object.keys(this.jobQ[Q]).length == 0) {
					delete this.jobQ[Q];
					resolve(true);
				} else if (Object.keys(this.jobQ[Q]).length > 0 && this.ipc3 && this.ipc3.hasOwnProperty('net') == true) {
					setTimeout(() => __closeQ(resolve, reject), 500);
				} else {
					console.log("Uh Oh...... (closeQ)");
					reject(false);
				}
			};

			return new Promise(__closeQ);
		};

		this.addrStates = bucketNo => addr => {
			let [hot, owe, canceled, ...BNs] = this.D.sellerStat(bucketNo, { from: addr }).reverse();
			let [earnings, sold, stock, no] = BNs.map(i => {
				return this.web3.toDecimal(i);
			});
			let eb = this.addrEtherBalance(addr);
			let tb = this.addrTokenBalance(addr);

			console.log(`DEBUG: - seller address ${addr} owe: ${owe}, earning: ${this.web3.toDecimal(this.web3.fromWei(earnings, 'ether'))} ethers`);

			return { hot, owe, earnings, sold, stock, no, eb, tb, addr, canceled, bucketNo };
		};

		this.closerStates = addr => {
			let [since, seen, cc, times, done, reward] = this.B.closerStat({ from: addr }).map(i => {
				return this.web3.toDecimal(i);
			});

			console.log(`DEBUG: - closer address ${addr}, reward: ${this.web3.toDecimal(this.web3.fromWei(reward, 'ether'))} ethers`);

			return { since, seen, cc, times, done, reward, addr };
		};

		this.giveTokens = Q => (issuer, tokenUnits) => statObj => {
			if (this.B.paused() == false && this.T.balanceOf(issuer).gt(tokenUnits) && this.T.balanceOf(statObj.addr).lt(1000000000000)) {
				//this.T.transfer(statObj.addr, tokenUnits, {from: issuer, gas: 180000});
				this.enqueue(issuer)({ contract: 'T', call: 'transfer', args: [statObj.addr, tokenUnits], txObj: { from: issuer, gas: 180000 }, Q });
			}

			return statObj;
		};

		this.depositToken = Q => tokenUnits => statObj => {
			if (this.B.paused() == false && this.T.balanceOf(statObj.addr).gte(tokenUnits) && statObj.stock == 0 && statObj.owe == false && statObj.canceled == false) {
				if (this.T.allowance(statObj.addr, this.B.address).lt(tokenUnits)) {
					console.log(`- Address ${statObj.addr} is approving 11BE accessing token for trade...`);
					//this.T.approve(this.B.address, tokenUnits, {from: statObj.addr, gas: 200000, gasPrice: 9000000000});
					this.enqueue(statObj.addr)({ contract: 'T', call: 'approve', args: [this.B.address, tokenUnits], txObj: { from: statObj.addr, gas: 200000, gasPrice: 9000000000 }, Q });
				}

				//this.B.depositStock(statObj.bucketNo, tokenUnits, {from: statObj.addr, gas: 240000, gasPrice: 4000000000});
				this.enqueue(statObj.addr)({ contract: 'B', call: 'depositStock', args: [statObj.bucketNo, tokenUnits], txObj: { from: statObj.addr, gas: 240000, gasPrice: 4000000000 }, Q });
				console.log(`- Address ${statObj.addr} depositing ${tokenUnits} tokens to 11be, bucket No.: ${statObj.bucketNo}`);
			} else {
				console.log(`- Address ${statObj.addr} did not put any token to 11be at this time...`);
			}

			return statObj;
		};

		this.giveStakes = Q => (issuer, tokenUnits) => cstatObj => {
			if (cstatObj.since == 0 && this.BT.balanceOf(cstatObj.addr).lt(tokenUnits)) {
				//this.BT.transfer(cstatObj.addr, tokenUnits, {from: issuer, gas: 180000});
				this.enqueue(issuer)({ contract: 'BT', call: 'transfer', args: [cstatObj.addr, tokenUnits], txObj: { from: issuer, gas: 180000 }, Q });
			}

			return cstatObj;
		};

		this.depositStake = Q => tokenUnits => cstatObj => {
			let times = this.web3.toBigNumber(tokenUnits).dividedBy(this.oneBuck);

			if (this.BT.balanceOf(cstatObj.addr).gte(this.B.dutyStake().plus(tokenUnits)) && cstatObj.since == 0) {
				if (this.BT.allowance(cstatObj.addr, this.B.address).lt(tokenUnits)) {
					console.log(`- Address ${cstatObj.addr} is approving 11BE accessing BucketToken for closer staking...`);
					//this.BT.approve(this.B.address, tokenUnits, {from: cstatObj.addr, gas: 200000, gasPrice: 9000000000});
					this.enqueue(cstatObj.addr)({ contract: 'BT', call: 'approve', args: [this.B.address, tokenUnits], txObj: { from: cstatObj.addr, gas: 200000, gasPrice: 9000000000 }, Q });
				}

				//this.B.closerDuty(this.web3.toDecimal(times), {from: cstatObj.addr, gas: 240000, gasPrice: 4000000000});
				this.enqueue(cstatObj.addr)({ contract: 'B', call: 'closerDuty', args: [this.web3.toDecimal(times)], txObj: { from: cstatObj.addr, gas: 300000, gasPrice: 4000000000 }, Q });
				console.log(`- Address ${cstatObj.addr} depositing ${times} tokens to 11be, intended to fulfill closer duty...`);
			} else {
				console.log(`- Address ${cstatObj.addr} cannot become a closer on 11be at this time...`);
			}

			return cstatObj;
		};

		this.estimateClosing = (bucketNo, earning) => addr => {
			let [sold, settled, supply, price, minstock] = this.B.marketSummary(bucketNo);
			let bucketList = this.D.browseStock(bucketNo, 0, this.maxClosing);
			let closedNo = 0;
			let accumulate = this.web3.toBigNumber(0);
			let unsettled = this.web3.toBigNumber(sold).minus(settled);
			let data = { accumulate, closedNo };

			let test = bucketList.reduce((data, co) => {
				data.accumulate.plus(this.web3.toBigNumber(co[2]));
				if (data.accumulate.lte(unsettled) && this.B.makerfee().mul(data.closedNo).lte(earning)) data.closedNo += 1;

				return data;
			}, data);

			let cost = this.B.closing.estimateGas(bucketNo, test.closedNo, { from: addr });
			let reward = this.B.makerfee().mul(test.closedNo);
			closedNo = test.closedNo;

			return { bucketNo, sold, settled, supply, price, minstock, unsettled, closedNo, cost, reward, addr };
		};

		this.closing = Q => cestObj => {
			if (cestObj.cost <= this.maxGasUsage // max gas spending 
			&& this.web3.eth.getBalance(cestObj.addr).gte(this.web3.toBigNumber(cestObj.cost).mul(9000000000)) // using gas price = 9 GWei
			) {
					//this.B.closing(cestObj.bucketNo, cestObj.closedNo, {from: cestObj.addr, gas: cestObj.cost, gasPrice: 9000000000});
					this.enqueue(cestObj.addr)({ contract: 'B', call: 'closing', args: [cestObj.bucketNo, cestObj.closedNo], txObj: { from: cestObj.addr, gas: cestObj.cost, gasPrice: 9000000000 }, Q });
				} else {
				console.log(` - Address ${cestObj.addr} do not want to perform closing at the moment ... (${cestObj.cost})`);
			}

			return cestObj;
		};

		this.buyToken = Q => (bucketNo, eth) => addr => {
			let wei = this.web3.toWei(eth, 'ether');

			if (this.web3.eth.getBalance(addr).gt(wei)) {
				let gasest = this.B.buyStock.estimateGas(bucketNo, { from: addr, value: wei });
				if (gasest <= 250000) {
					//this.B.buyStock(statObj.bucketNo, {from: statObj.addr, value: wei, gas: gasest});
					this.enqueue(addr)({ contract: 'B', call: 'buyStock', args: [bucketNo], txObj: { from: addr, value: wei, gas: gasest, gasPrice: 9000000000 }, Q });
				} else {
					console.log(`Address ${addr} cannot buy ${eth} eth of tokens due to high gas cost !!! (${gasest})\n*`);
				}
			} else {
				console.log(`Account has less than ${eth} ethers for token purchase.\n*`);
			}

			return { addr, bucketNo, wei };
		};

		this.checkOut = Q => statObj => {
			if (statObj.owe == true) {
				//B.payOut(statObj.bucketNo, {from: statObj.addr, gas: 300000, gasPrice: 9000000000});
				this.enqueue(statObj.addr)({ contract: 'B', call: 'payOut', args: [statObj.bucketNo], txObj: { from: statObj.addr, gas: 300000, gasPrice: 9000000000 }, Q });
				console.log(`!!!!!! Account ${statObj.addr} cashed out ${this.web3.fromWei(statObj.earnings, 'ether')} ether\n!!!!!! ${statObj.sold} token sold!`);
			} else if (statObj.no > 0) {
				console.log(`!!!!!! Account ${statObj.addr} only sold ${statObj.sold} out of ${statObj.stock} tokens at the moment...`);
			} else {
				console.log(` - Address ${statObj.addr} is not yet a seller on the market ...`);
			}

			return statObj;
		};

		this.changePrice = Q => (issuer, newPrice) => {
			if (this.B.paused() == true && this.B.changePrice.estimateGas(newPrice, { from: issuer }) < 900000) {
				//this.B.changePrice(newPrice, {from: issuer, gas: 920000, gasPrice: 9000000000})
				this.enqueue(issuer)({ contract: 'B', call: 'changePrice', args: [newPrice], txObj: { from: issuer, gas: 920000, gasPrice: 9000000000 }, Q });
			} else {
				console.log(`Oracle: not yet able to change price...\n*`);
			}

			return true;
		};

		this.BucketToken = this.web3.eth.contract(BucksObj.abi);
		this.BT = this.BucketToken.at(BucksObj.networks[networkID].address);
		this.oneBuck = this.web3.toBigNumber(10).toPower(8); //bucketToken decimal is 8

		this.maxClosing = 100;
		this.maxGasUsage = 5000000;
		this.jobQ = {};
	}

	// Ethereum web3 and 11be stuffs


	// passes: {addr1: passwd1, addr2: paasswd2, ...};
}

module.exports = CastIron;
