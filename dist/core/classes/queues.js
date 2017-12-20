'use strict';
 
const uuid  = require('uuid/v4');
const Wrap3 = require( __dirname + '/Wrap3.js' )

// Main Class
class JobQueue extends Wrap3 {
        constructor(networkID)
        {
                super(networkID);

                this.version = '1.0'; // API version
                this.jobQ = {};	// Should use setter / getter

		// fulfiller (for fulfill conditions)
		this.fulfiller = this.web3.eth.accounts[0];
		this.condition = null; // 'sanity' or 'fulfill'
        }

	// JobObj: {type: 'Token', contract: 'TKA', call: 'transfer', args: ['p1', 'p2'], txObj: {from: issuer, gas: 180000}, Q, p1, p2}
	//
	// Type is either "Token" or "Exchange", mind for capital initials; args is an array representing arguments to be passed into smart
	// contract function call (JobObj.call), the array itself are actually filled with string literals with real variables passed in as
	// elsements of JobObj of same names. The args array basically just records the order of vaiables during call. This allows conditional 
	// functions (TBD, see below) to access these variables easily.
	//
	// Conditional functions follows naming conventions of <type>_<call>_<condition>, where "condition" is either "sanity" or "fulfill"
	// for now. these conditional functions will be called with same arguments as enqueue itself (addr, jobObj). Currently, it is not yet decided
	// how to properly pass additional variables into conditional functions, with the exception of 'fulfiller', which is the wallet address to
	// be used to execute any fulfillment transactions as the results of 'fulfill' conditional function calls; This implies that 'fulfill' conditional
	// function may need to add new jobs into the queue, and it does so by prepending jobs to the one being checked.
	//
	// Before actual conditional function implementation, a simple class similar to order Cast-Iron queue, BEhavior.js will be used to test
	// the basic queue functionalities.
	enqueue = jobObj => addr => {
                let {Q, ...job} = jobObj;

                if (Q == undefined || typeof(this.jobQ[Q]) === 'undefined' || this.condition === null) { 
                        throw new Error("Queue error (enqueue)");
                } else if (typeof(this.jobQ[Q][addr]) === 'undefined') {
                        this.jobQ[Q][addr] = [];
                } 
		
		//conditional function call
		let cfname = `${jobObj.type}_${jobObj.call}_${this.condition}`;

		if (typeof(this[cfname]) === 'undefined') {
			throw new Error(`Invalid jobObj: ${JSON.stringify(jobObj, 0, 2)}`);
		} else if (this[cfname](addr, jobObj) == true) {
			let args = job.args.map((e) => 
			{ 
				if (typeof(job[e]) === 'undefined') {
					throw new Error(`jobObj missing element ${e} for ${cfname} action`); 
				}

				return job[e]; 
			});

			this.jobQ[Q][addr].push({...job, args}); // replace 

			return true;
		} else {
			return false;
		}
        }

	// jobObjMap: {addr1: jobObj1, addr2: jobObj2, ...}
	// TODO: improve this so that single address can perform multiple jobs within single batchJobs call.
	batchJobs = Q => jobObjMap =>
	{
                if (Q == undefined || typeof(this.jobQ[Q]) === 'undefined') throw "Queue error (batchJobs)";

		// return promise
		const __atOnce = jobObjMap => (resolve, reject) =>
		{
			let rc = Object.keys(jobObjMap).map( (addr) => { this.enqueue(jobObjMap[addr])(addr) });
			if ( rc.reduce((result, stat) => { return result && (stat === true) }) ) {
				resolve(true);
			} else {
				reject(rc);
			}

		}

	        return new Promise(__atOnce(jobObjMap));
	}

	prepareQ = tokenList => 
	{
		if (this.hotGroups(tokenList) !== true) throw new Error(`Not all symbols in tokenList is registered...`);

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
	}

	// passes: {addr1: passwd1, addr2: paasswd2, ...}; 
	// passes object should be managed by Account Manager (TBD)
	processQ = Q => passes => {
		if (Q == undefined || typeof(this.jobQ[Q]) === 'undefined') throw "Queue error (processQ)";

        	let results = Promise.resolve();

        	Object.keys(passes).map((addr) => {
                	if (typeof(this.jobQ[Q][addr]) === 'undefined' || this.jobQ[Q][addr].length == 0) {
				delete Q[addr];
                        	return;
                	}

	                results = results.then( () => {
        	                return this.unlockViaIPC(passes[addr])(addr).then(() => {
                	                this.jobQ[Q][addr].map((o) => {
                        	                let tx = this.CUE[o.type][o.contract][o.call](...o.args, o.txObj);
						console.log(`QID: ${Q} | ${o.type}: ${addr} doing ${o.call} on ${o.contract}, txhash: ${tx}`);
                                	})
	                        }).then( () => {
        	                        this.ipc3.personal.lockAccount(addr, (e,r) => {
                        	                if (e) throw(e);
                	                        console.log(`** account: ${addr} is now locked`);
						delete this.jobQ[Q][addr];
	                                });
        	                })
                	})
			.catch((error) => { console.log(error); } );
        	});

		results = results.then(this.closeQ(Q));

		return results;
	}

	closeQ = Q => {
		if (Q == undefined || typeof(this.jobQ[Q]) === 'undefined') throw "Queue error (closeQ)";

		const __closeQ = (resolve, reject) => {
			if (Object.keys(this.jobQ[Q]).length == 0) {
				delete this.jobQ[Q];
				resolve(true);
			} else if (Object.keys(this.jobQ[Q]).length > 0 && this.ipc3 && this.ipc3.hasOwnProperty('net') == true){
				setTimeout( () => __closeQ(resolve, reject), 500 );
			} else {
				console.log("Uh Oh...... (closeQ)");
				reject(false);
			}
		};

		return new Promise(__closeQ);
	};
}

module.exports = JobQueue;
