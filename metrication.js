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
	
	//console.log("loaded metrication");
	
	MCE.prefs.setPref('pref_metric', true);
	MCE.prefs.setPref('pref_celsius', true);
	MCE.prefs.setPref('pref_24h', true);
	//MCE.prefs.setPref('pref_myCurrency', 'EUR'),
	MCE.prefs.setPref('pref_currency_enabled', false);
	MCE.prefs.setPref('pref_one_way', true);
	MCE.prefs.setPref('pref_dec_sep', ','),
	MCE.prefs.setPref('pref_thou_sep', '.');
	MCE.core.convertDoc(document);
})();
