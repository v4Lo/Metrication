"use strict";

(function () {
	/**
	 * Check and set a global guard variable.
	 * If this content script is injected into the same page again,
	 * it will do nothing next time.
	 */
	if (window.metricationHasRun) {
		return;
	}
	window.metricationHasRun = true;
	
	//browser.storage.local.clear();
	//console.log("loaded metrication");
	
	MCE.prefs.setPref('pref_metric', true);
	MCE.prefs.setPref('pref_celsius', true);
	MCE.prefs.setPref('pref_24h', true);
	MCE.prefs.setPref('pref_one_way', true);
	MCE.prefs.setPref('pref_dec_sep', ','),
	MCE.prefs.setPref('pref_thou_sep', '.');
	MCE.prefs.setPref('pref_currency_enabled', true);
	
	MCE.currency.iface.buildCache().then(function() {
		browser.storage.local.get("rates").then(function(rates) {
			if(rates["rates"] !=  null) {
				MCE.currency.iface.rates = rates["rates"];
				MCE.currency.iface.rates["EUR"] = 1.0;
			} else {
				MCE.prefs.setPref('pref_currency_enabled', false);
			}
			MCE.core.convertDoc(document);
		});
	});
})();
