"use strict";

MCE.prefs={
	/*
		Defaults: type: 'boolean', init: true, manual: false
		If type is set to string, the default init is the empty string.
	*/
	pref_descriptor:{
		pref_expert_config:{
			init: false,
			manual: true,
		},
		configured:{
			init: false,
			manual: true,
		},
		last_upgraded: {
			type: "string",
			manual: true,
		},
		last_noconf_notif: {
			type: "string",
			init: 0,
			manual: true,
		},

		pref_24h:{
			manual: true,
		},
		pref_fullpage_menu:{
			init: false,
		},
		pref_selection_menu:{},
		pref_metric:{
			manual: true,
		},
		pref_celsius:{
			manual: true,
		},
		pref_in_fract:{
			manual: true,
		},
		pref_custom_single:{
			manual: true,
		},
		pref_currency_enabled:{},
		pref_myCurrency:{
			type: 'string',
			manual: true,
		},
		pref_foreignCurrency:{
			type: 'string',
			manual: true,
		},
		pref_thou_sep:{
			type: 'string',
			init: ',',
		},
		pref_dec_sep:{
			type: 'string',
			init: '.',
		},
		pref_one_way:{
			init: false,
		},
		pref_only_show_converted:{
			init: false,
		},
		pref_default_unit:{
			type:'string',
		},
		pref_auto_convert:{
			init: false,
		},
		premium_key:{
			type:'string',
		},
		last_prefs_tab:{
			type:'string',
			init:'0',
			manual:true,
		},
		pref_enable_precision_units:{
			init: false,
		},
		pref_precision_units:{
			type:'string',
		},
		pref_enable_precision_currency:{
			init:false,
		},
		pref_precision_currency:{
			type:'string',
		},
		pref_exchange_hours:{
			type:'string',
			init:'24',
		},
		pref_custom_enabled:{},
	},
	
	// Contains the cached prefs
	prefs:{
	},

	// public; direct use encouraged
	getPref(pref)
	{
		if (this.prefs[pref]==undefined) {
			MCE.iface.log("Unknown preference: "+pref);
			return null;
		}
		return this.prefs[pref];
	},
	
	// public; direct use encouraged
	setPref(pref, val)
	{
		this.prefs[pref]=val;
		return true;
	},

	prefExists(pref)
	{
		return(this.pref_descriptor[pref]!=undefined);
	},

	getPrefType(pref)
	{
		if (!this.prefExists(pref))
			return undefined;
		if (this.pref_descriptor[pref].type==undefined)
			return 'boolean';
		return this.pref_descriptor[pref].type;
	},

	getPrefDefault(pref)
	{
		if (!this.prefExists(pref))
			return undefined;
		if (this.pref_descriptor[pref].init!=undefined)
			return this.pref_descriptor[pref].init;
		if (this.getPrefType(pref)=='boolean')
			return true;
		return '';
	},

	isPrefManual(pref)
	{
		if (!this.prefExists(pref))
			return undefined;
		if (this.pref_descriptor[pref].manual==undefined)
			return false;
		return this.pref_descriptor[pref].manual;
	},
}