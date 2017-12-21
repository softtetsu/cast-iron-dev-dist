'use strict';

const bittrex = require('node-bittrex-api');
const PriceFeedBase = require(__dirname + "/PriceFeedBase.js");

class PriceFeedBittrex extends PriceFeedBase{
    constructor() {
        super();

   // make the api call to bittrex to get the ticker for one token
        this.priceForToken = token => {

            const getPrice = (resolve, reject) => bittrex.getticker({ market: "ETH-" + token }, ticker => {
                if (ticker && ticker.success) {
                    resolve(ticker.result.Last);
                } else {
                    reject(0);
                }
            });

            return new Promise(getPrice);
        };
    }



}

module.exports = PriceFeedBittrex;
