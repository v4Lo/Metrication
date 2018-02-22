"use strict";

MCE.currency.iface = {
	cacheDate: 0,
	rates: 0,

	async buildCache() {
		const now = new Date();

		if (this.cacheDate > now) {
			//MCE.iface.log("Data is too new: " + this.cacheDate + " > " + now);
			return
		}

		return browser.storage.local.get("date").then(function (date) {
			if (!date["date"]) {
				return MCE.currency.iface.refreshRates();
			} else {
				MCE.currency.iface.cacheDate = new Date(date["date"]);
				MCE.currency.iface.cacheDate.setDate(MCE.currency.iface.cacheDate.getDate() + 1);
				MCE.currency.iface.cacheDate.setHours(17); // 17:05 in relative UTC, good enough. fixer.io spec is 16:00? daylight saving? TODO better conversion source
				MCE.currency.iface.cacheDate.setMinutes(5);
				if (MCE.currency.iface.cacheDate <= now) {
					return MCE.currency.iface.refreshRates();
				}
			}
		});
	},

	async refreshRates() {
		MCE.iface.log("Retrieving currency rates");
		try {
			const FETCH_TIMEOUT = 4000; //reasonable
			let didTimeOut = false;
			return new Promise(function (resolve, reject) {
				const timeout = setTimeout(function () {
						didTimeOut = true;
						reject(new Error('Request timed out'));
					}, FETCH_TIMEOUT);

				fetch('https://api.fixer.io/latest?base=EUR')
				.then(function (response) {
					// Clear the timeout as cleanup
					clearTimeout(timeout);
					if (!didTimeOut) {
						resolve(response);
					}
				})
				.catch(function (err) {
					// Rejection already happened with setTimeout
					if (didTimeOut)
						return;
					// Reject with error
					reject(err);
				});
			})
			.then(function (response) {
				if (response.status >= 400) {
					const error = new error("Bad response from server")
						error.response = response
						error.message = "your error message,you can swith the status and set the message"
						throw error
				}
				return response.json();
			}).then(function (response) {
				return browser.storage.local.set(response);
			})
			.catch(function (err) {
				// Error: response error, request timeout or runtime error
				console.log('promise error! ', err);
				return false;
			});
		} catch (err) {
			MCE.iface.log("Retrieving currency rates failed " + err);
		}
	},

	getCache(from, to) {
		if (!this.rates[from] || !this.rates[to]) { // data for currency unavailable
			//console.log("unavailable data");
			return 0;
		}

		const toEUR = 1.0 / this.rates[from];
		const fromEUR = this.rates[to];

		return (toEUR * fromEUR);
	}
}
