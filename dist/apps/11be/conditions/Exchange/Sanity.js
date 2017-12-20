module.exports =
{
        Exchange_buyStock_sanity(addr, jobObj) 
	{
		let gasCost = this.gasCostEst(addr, jobObj.txObj);
		let total = gasCost.add(jobObj.txObj.value);

		if ( this.web3.eth.getBalance(addr).gt(total) ) {
			return true 
		} else {
			return false;
		}
	},

        Exchange_depositStock_sanity(addr, jobObj)
	{
		// depositStock(bucketNo, tokenUnits)
		let [ bucketNo, tokenUnits ] = jobObj.args.map((i) => { return jobObj[i]; });
		let statObj = this.addrStats(jobObj.contract, bucketNo)(addr);
		let gasCost = this.gasCostEst(addr, jobObj.txObj);
		let exchange = this.CUE.Exchange[jobObj.contract].address;

		if (
			this.CUE.Exchange[jobObj.contract].paused() == false
		     && this.CUE.Token[jobObj.contract].balanceOf(addr).gte(tokenUnits)
		     && this.CUE.Token[jobObj.contract].allowance(addr, exchange).gte(tokenUnits)
		     && this.web3.eth.getBalance(addr).gt(gasCost)	
		     && statObj.stock == 0
		     && statObj.owe == false
		     && statObj.canceled == false
		) {
			return true;
		} else {
			return false;
		}
	},

        Exchange_cancelDuty_sanity(addr, jobObj) 
	{
		let statObj = this.closerStats(jobObj.contract)(addr);
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if ( 
			statObj.since != 0 
		     && this.web3.eth.getBalance(addr).gt(gasCost)	
		) {
			return true;
		} else {
			return false;
		}
	},

        Exchange_addStaff_sanity(addr, jobObj) 
	{
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
		        addr == this.CUE.Exchange[jobObj.contract].owner() 
		     && this.web3.eth.getBalance(addr).gt(gasCost)	
		) {
			return true;
		} else {
			return false;
		}
	},

        Exchange_cancelStock_sanity(addr, jobObj) 
	{
		// cancelStock(bucketNo)
		let [ bucketNo ] = jobObj.args.map((i) => { return jobObj[i]; });
		let statObj = this.addrStats(jobObj.contract, bucketNo)(addr);
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
		        statObj.stock != 0
		     && this.CUE.Exchange[jobObj.contract].paused() == false
		     && statObj.canceled == false
		     && this.CUE.Exchange[jobObj.contract].makerfee().eq(jobObj.txObj.value)
		     && this.web3.eth.getBalance(addr).gt(gasCost)
		) {
			return true;
		} else {
			return false;
		}

	},

        Exchange_changePrice_sanity(addr, jobObj) 
	{
		// changePrice(newPrice)
		let [ newPrice ] = jobObj.args.map((i) => { return jobObj[i]; });
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
			this.CUE.Exchange[jobObj.contract].paused() == true
		     && addr == this.CUE.Exchange[jobObj.contract].owner() 
		     && this.web3.eth.getBalance(addr).gt(gasCost)	
		     && newPrice > 0
		) {
			return true;
		} else {
			return false;
		}
	},

        Exchange_closerDuty_sanity(addr, jobObj) 
	{
		// closerDuty(times)
		let [ times ] = jobObj.args.map((i) => { return jobObj[i]; });
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
			this.CUE.ExchangeT.balanceOf(addr).gte(20000 + times)
		     && this.web3.eth.getBalance(addr).gt(gasCost)	
		     && times >= 10
		) {
			return true;
		} else {
			return false;
		}
	},

        Exchange_payOut_sanity(addr, jobObj) 
	{
		// payOut(bucketNo)
		let [ bucketNo ] = jobObj.args.map((i) => { return jobObj[i]; });
		let gasCost = this.gasCostEst(addr, jobObj.txObj);
		let statObj = this.addrStats(jobObj.contract, bucketNo)(addr);

		if (
		        statObj.no > 0
		     && statObj.owe == true
		     && this.web3.eth.getBalance(addr).gt(gasCost)
	        ) {
	   		return true;
		} else {
			return false;
		}		
	},

        Exchange_withdrawExchangeFee_sanity(addr, jobObj) 
	{
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
			this.CUE.Exchange[jobObj.contract].exchangefee() > 0
		     && addr == this.CUE.Exchange[jobObj.contract].owner() 
		     && this.web3.eth.getBalance(addr).gt(gasCost)	
		) {
			return true;
		} else {
			return false;
		}
	},

        Exchange_closing_sanity(addr, jobObj) 
	{
		// closing(bucketNo, closeNo)
		let [ bucketNo, closeNo ] = jobObj.args.map((i) => { return jobObj[i]; });
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
			jobObj.txObj.gas <= this.maxGasUsage
		     && this.web3.eth.getBalance(addr).gt(gasCost)	
		) {
			return true;
		} else {
			return false;
		}
	}
}
