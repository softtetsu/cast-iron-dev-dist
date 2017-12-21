'use strict';

class PriceFeedBase{
	constructor() {

        //TODO: move this to Functional
        this.values = object => {
            return Object.keys(object).map(k =>{return object[k]})
        }

        // This function is to get a price for tokens, the input is an array like ["LTC", "GNT"],
        // the output is a promise which can be resovled to a JSON like {GNT: 0.00061695, LTC: 0.41427448}
        this.priceForTokens = tokens => {
            var res = {};
            const getPrices = (resolve, reject) => {
                tokens.reduce((res, token, index, tokens) => {
                    this.priceForToken(token).then(data => this.addTokenPrice(resolve, tokens, res, token, data), error => this.addTokenPrice(reject, tokens, res, token, error));
                    return res;
                }, res);
            };
            return new Promise(getPrices);
        };


        // add the price information to arr 
        this.addTokenPrice = (resolve, tokens, arr, token, price) => {
            if ("undefined" === typeof(arr[token])) {
                arr[token] = price;
            }

            // TODO: This is a tempory workaround to wait all promises returned, need a cleaner way to do it.,
            if (Object.keys(arr).length == tokens.length) {
                resolve(arr);
            }
        };

        this.priceForToken = token => {
            throw("The subclass needs to impletment this priceForToken function!");
        }

    }

}


module.exports = PriceFeedBase;
