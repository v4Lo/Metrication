"use strict";

MCE.currency.iface={
	cacheExpiration:24*3600000, // on a daily basis
	pO:false,

	// is the cache expired for this currency?
	cacheExpired(curr)
	{
		var d=new Date();
		var pref='date_'+curr;
		if (MCE.prefs.getPrefType(pref)==MCE.prefs.PREF_INVALID) {
			// not available, ergo "expired"
			return true;
		}

		var expirationDate=Number(MCE.prefs.getCharPref(pref))+this.cacheExpiration;
		var currentDate=d.getTime();
		return (currentDate>expirationDate);
	},

	// get this rate from cache, if available (no expiration test)
	retrieveCache(from,to)
	{
		var pref='rate_'+from+'_'+to;
		if (MCE.prefs.getPrefType(pref)==MCE.prefs.PREF_INVALID) {
			// not available
			return false;
		}
		return MCE.prefs.getCharPref(pref);
	},

	// try getting this rate from cache, if available and not expired
	getCache(from,to)
	{
		if (this.cacheExpired(to)) {
			return false;
		}
		return this.retrieveCache(from,to);
	},

	// This saves the ENTIRE cache at once (all rates)
	saveCache(base, rates)
	{
		var d=new Date();
		MCE.prefs.setCharPref('date_'+base, d.getTime());
		for (var curr in rates)
			MCE.prefs.setCharPref('rate_'+curr+'_'+base, rates[curr]);
		return true;
	},

        init()
        {

		// timedRefreshRates needs currency.iface
		MCE.currency.timedRefreshRates();
        }
}

MCE.currency.iface.init();