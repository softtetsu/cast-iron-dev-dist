module.exports =
{
        Token_approve_sanity(addr, jobObj)
	{
		// approve(toAddr, amount)
		let [ exchange, tokenUnits ] = jobObj.args.map((i) => { return jobObj[i] });
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
			this.CUE.Token[jobObj.contract].balanceOf(addr).gte(tokenUnits)
		     && this.CUE.Token[jobObj.contract].allowance(addr, exchange).gte(tokenUnits)
		     && this.web3.eth.getBalance(addr).gte(gasCost)
		   ) {
			   return true;
		   } else {
			   return false;
		   }
	},

        Token_transfer_sanity(addr, jobObj) 
	{
		// transfer(toAddr,amount)
		let [ exchange, tokenUnits ] = jobObj.args.map((i) => { return jobObj[i] });
		let gasCost = this.gasCostEst(addr, jobObj.txObj);

		if (
			this.CUE.Token[jobObj.contract].balanceOf(addr).gte(tokenUnits)
		     && this.web3.eth.getBalance(addr).gte(gasCost)
		) {
			return true;
		} else {
			return false;
		}
	}
}
