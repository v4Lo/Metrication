"use strict";

// Converter document states

// Enabled: the document can be acted upon (enable toolbar icon)
MCE.STATE_ENABLED = 0x01;
// Converted: the document has been converted
MCE.STATE_CONVERTED = 0x02;
// Convertible: the document CAN be converted
MCE.STATE_CONVERTIBLE = 0x04;
// Conversion in progress: self-explantory
MCE.STATE_CONVERSION_PROGRESS = 0x08;
// Load in progress: self-explanatory
MCE.STATE_LOAD_PROGRESS = 0x10;

MCE.iface = {
	alreadyConfigured: false,

	customConversion_text: false,
	noconf_delay1: 3600000, // one hour after installing
	noconf_delay2: 3600000 * 24, // every day afterwards
	status_icon_states: {
		ON: {
			icon: 'chrome://converter/skin/cv_stat_on.png',
			label: 'Click to restore page',
			class: 'on',
			state:
			MCE.STATE_ENABLED +
			MCE.STATE_CONVERTIBLE +
			MCE.STATE_CONVERTED,
		},
		OFF: {
			icon: 'chrome://converter/skin/cv_stat_off.png',
			label: 'Click to convert page',
			class: 'off',
			state:
			MCE.STATE_ENABLED +
			MCE.STATE_CONVERTIBLE,
		},
		UNAVAILABLE: {
			icon: 'chrome://converter/skin/cv_stat_denied.png',
			label: "This page can't be converted",
			class: 'denied',
			state:
			0,
		},
		PROGRESS: {
			icon: 'chrome://converter/skin/cv_stat_progress.png',
			label: 'Conversion in progress',
			class: 'progress',
			state:
			MCE.STATE_CONVERTIBLE +
			MCE.STATE_CONVERSION_PROGRESS,
		},
		LOADING: {
			icon: 'chrome://converter/skin/cv_stat_denied.png',
			label: 'This page is still loading...',
			class: 'denied',
			state:
			MCE.STATE_LOAD_PROGRESS,
		}
	},

	get_status_meta (status) {
		var meta = MCE.iface.status_icon_states[status];
		if (!meta)
			throw "Metrication: Unknown icon state [" + status + "]";

		return meta;
	},

	set_status(status) {
		var meta = MCE.iface.get_status_meta(status);

		var cpi = document.getElementById("context_converterselect"); /* context menu item */
		var tpi = document.getElementById("converter_status"); /* toolbar main button */
		var mpi = document.getElementById("converter-status-convertPage"); /* toolbar menu item */
		if (!mpi || !tpi || !mpi)
			return false;

		if (mpi) {
			mpi.label = meta.label;
			mpi.image = meta.icon;
			mpi.disabled = !(meta.state & MCE.STATE_ENABLED);
		}

		if (cpi) {
			cpi.label = meta.label;
			cpi.image = meta.icon;
			cpi.disabled = !(meta.state & MCE.STATE_ENABLED);
		}

		if (tpi) {
			tpi.setAttribute('class', "toolbaritem-1 chromeclass-toolbar-additional " + meta.class);
			tpi.setAttribute('tooltiptext', meta.label);
		}
		if (status == "ON" || status == "OFF")
			MCE.iface.show_notifications();
		return true;
	},

	// Only applicable for the current window (tab)
	get_status () {
		if (gBrowser.webProgress.isLoadingDocument)
			return "LOADING";

		var newPage = MCE.iface.getFunctionalPageState(gBrowser.contentWindow);

		if (newPage == 0)
			return "UNAVAILABLE";
		if (newPage & MCE.STATE_CONVERTIBLE && newPage & MCE.STATE_ENABLED)
			return "OFF";
		if (newPage & MCE.STATE_CONVERTED)
			return "ON";

		// Javascript is single-threaded, so we couldn't be here while also
		// performing the conversion.
		throw "Metrication iface::get_status: unknown page state: " + newPage;
	},

	// Only applicable for the current window (tab)
	restore_status() {
		MCE.iface.set_status(MCE.iface.get_status());
	},

	show_notifications () {
		if (this.alreadyConfigured)
			return;

		if (MCE.prefs.getPref('configured')) {
			this.alreadyConfigured = true;
			return;
		}

		var now = new Date().getTime();
		var lastnotif,
		notifdelay;
		if (lastnotif = MCE.prefs.getPref("last_noconf_notif"))
			notifdelay = this.noconf_delay2;
		else {
			notifdelay = this.noconf_delay1;
			lastnotif = MCE.prefs.getPref("last_upgraded");
		}
		lastnotif = new Number(lastnotif); // cast to int
		if (lastnotif + notifdelay > now)
			return;
		MCE.prefs.setPref("last_noconf_notif", new String(new Date().getTime()));

		var notifBox = gBrowser.getNotificationBox();
		notifBox.appendNotification(
			"You haven't configured Converter yet — and it just takes a minute!", // label
			"converter-configuration-notification", // value used to identify the notification
			"chrome://converter/skin/cv_stat_on_24.png", // URL of image to appear on the notification
			"PRIORITY_INFO_LOW", // priority
			[// buttons
				{
					callback (button, desc) {
						MCE.iface.openPrefsWindow();
					},
					label: "Configure",
					popup: null // popup
				}
			]);
	},

	conversionStart(win) {
		window.setCursor('wait');
		MCE.current_URI = document.URL;
		if (win == gBrowser.contentWindow) {
			MCE.iface.set_status('PROGRESS');
		}
	},

	conversionEnd(win) {
		window.setCursor('auto');
		MCE.iface.setOldPage(win);
		if (win == gBrowser.contentWindow) {
			MCE.iface.set_status('ON');
		}
	},

	showLocation(loc) {
		window.setTimeout(function () {
			MCE.iface.browse(loc);
		}, 100);
	},

	browse(loc) {
		gBrowser.selectedTab = gBrowser.addTab(loc);
	},

	onToolboxPopup () {
		return true;
	},

	doWelcome() {
		var decision = false;

		// IMPORTANT! The order of the tests below is significant!
		if (
			(MCE.prefs.getPrefType('current_version') == MCE.prefs.PREF_INVALID) ||
			(MCE.prefs.getCharPref('current_version') == '')) {
			MCE.prefs.setCharPref('current_version', cver);
			decision = 'install';
		}
		if (
			(MCE.prefs.getPrefType('first_version') == MCE.prefs.PREF_INVALID) ||
			(MCE.prefs.getCharPref('first_version') == '')) {
			MCE.prefs.setCharPref('first_version', MCE.prefs.getCharPref('current_version'));
		}
		var pver = MCE.prefs.getCharPref('current_version');
		if (pver != cver) {
			MCE.prefs.setCharPref('current_version', cver);
			decision = 'upgrade';
		}
		if (!decision) {
			// business as usual
			return false;
		}

		MCE.MCE.prefs.setPref("last_upgraded", new String(new Date().getTime()));

		// install
		if (decision == 'install') {
			MCE.iface.installButton();
			this.showLocation("http://www.the-converter.co/welcome.php?ver=" + cver);
			return true;
		}

		// upgrade
		var fver = MCE.prefs.getCharPref('first_version');

		// Cleanup -- this has to remain here forever
		if (pver < "1.1.4") {
			// Install button in toolbar and remove obsolete preferennces
			MCE.iface.installButton();

			prefs = Components.classes["@mozilla.org/preferences-service;1"].
				getService(Components.interfaces.nsIPrefService);

			// Remove obsolete preference and cache
			MCE.prefs.deleteBranch("extensions.converter.preferences.pref_fullpage_icon");
			MCE.prefs.deleteBranch("extensions.converter.currency_data");

			// Reset last tab to "basic"
			MCE.prefs.setStringPref("extensions.converter.preferences.last_prefs_tab", "0");

			// Retrieve currency rates using the new mechanism, if you had any defined
			if (MCE.currency != undefined && MCE.currency.iface != undefined)
				MCE.currency.timedRefreshRates();
		}

		this.showLocation("http://www.the-converter.co/whatsnew/?ver=" + cver + "&fver=" + fver + "&pver=" + pver);
	},

	getCBody(win) {
		var cBodyT = win.document.getElementsByTagName("HTML");
		if (cBodyT.length) {
			return cBodyT[0];
		}
		MCE.iface.log("Metrication: failed finding the top-level HTML element!");
		return false;
	},

	setNewPage(win) {
		if (win == undefined) {
			win = gBrowser.contentWindow;
		}
		var cBody = MCE.iface.getCBody(win);
		if (cBody) {
			cBody.setAttribute("converter_extension_converted", false);
			MCE.iface.set_status('OFF');
			return true;
		}
	},

	setOldPage(win) {
		var cBody = this.getCBody(win);
		if (cBody) {
			cBody.setAttribute("converter_extension_converted", true);
			return true;
		}
	},

	/*
	 * This method returns the partial state that it can, among
	 * this object's STATE_* properties, as such:
	 * - 0, if this window is not convertible (think about:*)
	 * - STATE_CONVERTIBLE, if not currently converted but could be converted
	 * - STATE_CONVERTIBLE + STATE_CONVERTED, if both convertible AND already converted
	 */
	getFunctionalPageState(win) {
		var cBody = this.getCBody(win);
		if (!cBody)
			return 0;

		if (cBody.getAttribute("converter_extension_converted") == "true")
			return MCE.STATE_CONVERTIBLE + MCE.STATE_CONVERTED;

		return MCE.STATE_ENABLED + MCE.STATE_CONVERTIBLE;
	},

	installButton () {
		var id = "converter_status";
		var toolbar = document.getElementById("nav-bar");
		if (document.getElementById(id))
			return;

		toolbar.insertItem(id, null);
		toolbar.setAttribute("currentset", toolbar.currentSet);
		document.persist(toolbar.id, "currentset");

		toolbar.collapsed = false;
	},

	initPremiumControls() {
		var cbp = document.getElementById('converter-buy-premium');
		if (cbp != undefined)
			cbp.setAttribute("hidden", MCE.premium != undefined);
	},

	monitorTab (tab) {
		tab.addProgressListener(MCE.iface.tabProgressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_WINDOW);
	},

	init() {
		// Welcome first ----------------------------------------------------
		MCE.iface.doWelcome();

		// Now the proper stuff ---------------------------------------------
		var tmpElement = document.getElementById("contentAreaContextMenu");
		if (tmpElement)
			tmpElement.addEventListener("popupshowing", MCE.iface.onPopup, false);

		tmpElement = document.getElementById("converter-status-popup");
		if (tmpElement)
			tmpElement.addEventListener("popupshowing", MCE.iface.onToolboxPopup, false);

		if (typeof gBrowser != 'undefined') {
			MCE.iface.monitorTab(gBrowser.selectedBrowser);
			var container = gBrowser.tabContainer;
			container.addEventListener("TabSelect", MCE.iface.tabSwitched, false);
			container.addEventListener("TabOpen", MCE.iface.tabOpened, false);
		}
	},

	tabSwitched(event) {
		MCE.iface.restore_status();
	},

	tabOpened(event) {
		MCE.iface.monitorTab(gBrowser.getBrowserForTab(event.target));
	},

	/**
	 * This function is executed when Firefox's contextual popup menu pops up.
	 * It just triggers MCE.core.doConversion() and, depending on the
	 * result, shows the conversion result in the popup menu.
	 */
	onPopup() {
		var item = document.getElementById("context_converterselect");

		// No selection -- show or hide "Convert entire page" based on preferences
		if (!gContextMenu.isTextSelected) {
			if (!MCE.prefs.getPref('pref_fullpage_menu')) {
				item.hidden = true;
				return true;
			}
			item.hidden = false;
			var pageState = MCE.iface.getFunctionalPageState(gBrowser.contentWindow);
			if (pageState & MCE.STATE_CONVERTED)
				item.setAttribute("label", 'Restore page');
			else if (pageState & MCE.STATE_CONVERTIBLE)
				item.setAttribute("label", 'Convert the entire page');
			else
				item.hidden = true;
			return true;
		}

		// Selection
		/*
		We need to address a combination of situations here:
		1. pref_selection_menu -- ON/OFF
		3. conversion available -- YES/NO

		(3) only needs to be triggered if (1)
		 */
		var visible;
		var label;
		var sel = getBrowserSelection();

		// TODO: this is a bit iffy, what if two tabs start conversion at the same time?
		MCE.current_URI = document.URL;

		if (!MCE.prefs.getPref('pref_selection_menu')) {
			label = '';
		} else {
			var cr = MCE.core.doConversion(sel, false);
			if (!cr || cr.inhibit) {
				label = '';
				if (MCE.prefs.getPref("pref_default_unit").length) {
					var re = /[0-9.,]+/;
					var match = re.exec(sel);
					if (match) {
						cr = MCE.core.doConversion(match[0] + ' ' + MCE.prefs.getPref("pref_default_unit"));
						if (cr && !cr.inhibit) {
							label = cr.inValue + " " + cr.inUnit + " = " + cr.outCustom;
						}
					}
				}
			} else {
				label = cr.inValue + " " + cr.inUnit + " = " + cr.outCustom;
			}
		}
		if (!label) {
			item.hidden = true;
			return false;
		}
		item.hidden = false;
		item.setAttribute("label", label);
		return true;
	},

	statusClicked(evt) {
		/*
		// Unfortunately icon switching doesn't work well with tabs, to my knowledge,
		// so we'll have to keep a single icon throughout. See linkification.
		var cvStatus = document.getElementById("converter-status-hbox");
		cvStatus.src = 'chrome://converter/skin/cv_stat_on.png';
		alert("Clicked!");
		 */
		if (evt.button != 0) {
			return true;
		}
		this.fullPageFromStatus();
	},

	fullPageFromStatus() {
		if (this.get_status_meta(this.get_status()).state & MCE.STATE_ENABLED)
			this.fullPageAction(gBrowser.contentWindow);
	},

	triggerCustom(content) {
		this.customConversion_text = content;
		this.customConversionPopup();

	},

	customConversionPopup() {
		var w = window.openDialog("chrome://converter/content/custom_conversion.xul",
				"Metrication_custom", "centerscreen");
		w.focus();
	},

	openPrefsWindow() {
		var w = window.openDialog("chrome://converter/content/converterPrefDialog.xul",
				"Metrication_preferences", "centerscreen");
		w.focus();
		MCE.prefsWindow = w;
	},

	custom_conversion_keyup(event) {
		if (event.keyCode == 27) {
			this.custom_conversion_close();
		}
		if (event.keyCode == 13 && event.ctrlKey) {
			this.custom_conversion_convert();
		}
	},

	custom_conversion_convert() {
		if (window.document.getElementById('strict').checked) {
			var cr = opener.MCE.core.doConversion(window.document.getElementById('beef').value, false);
			if (cr.inUnit == undefined || cr.inhibit) {
				window.document.getElementById('in_unit').value = 'n/a';
			} else {
				window.document.getElementById('in_unit').value = cr.inUnit;
			}
			if (cr.inValue == undefined || cr.inhibit) {
				window.document.getElementById('in_value').value = 'n/a';
			} else {
				window.document.getElementById('in_value').value = cr.inValue;
			}
			if (cr.outCustom == undefined || cr.inhibit) {
				window.document.getElementById('hamburger').value = '';
			} else {
				window.document.getElementById('hamburger').value = cr.outCustom;
			}
		} else {
			window.document.getElementById('hamburger').value = opener.MCE.core.convertText(window.document.getElementById('beef').value);
		}
		window.document.getElementById('beef').focus();
		window.document.getElementById('beef').select();
	},

	custom_conversion_close() {
		MCE.prefs.setPref('pref_custom_single', window.document.getElementById('strict').checked);
		window.close();
	},

	custom_conversion_open() {
		window.document.getElementById('strict').checked = MCE.prefs.getPref('pref_custom_single');
		window.document.getElementById('beef').focus();
		window.addEventListener('keyup', function (e) {
			MCE.iface.custom_conversion_keyup(e);
		}, false);
		this.custom_conversion_switch();
		if (opener.MCE.iface.customConversion_text) {
			window.document.getElementById('beef').value = opener.MCE.iface.customConversion_text;
			opener.MCE.iface.customConversion_text = false;
			this.custom_conversion_convert();
		}
	},

	custom_conversion_switch() {
		window.document.getElementById('in_value_box').hidden =
			window.document.getElementById('in_unit_box').hidden =
			!window.document.getElementById('strict').checked;
	},

	log (message) {
		console.log('[Metrication extension] ' + message);
	},

	// TODO: This is totally silly
	getDocument(win) {
		return win.document;
	},

	getAllDocuments(win) {
		var docs = [];
		var tmp = win;
		if (tmp.length > 0) {
			for (var i = 0; i < tmp.length; i++) {
				docs.push(tmp[i].document);
			}
		}
		docs.push(tmp.document);
		return docs;
	},

	tabProgressListener: {
		onLocationChange (aProgress, aRequest, aURI) {},

		onProgressChange (aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) {},

		onSecurityChange (aWebProgress, aRequest, aState) {},

		QueryInterface (aIID) {
			if (
				aIID.equals(Components.interfaces.nsIWebProgressListener) ||
				aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
				aIID.equals(Components.interfaces.nsISupports))
				return this;
			throw Components.results.NS_NOINTERFACE;
		},

		onStateChange (aWebProgress, aRequest, aFlag, aStatus) {
			if (!(aFlag & Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW))
				return;

			if (
				aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP &&
				MCE.core.isConvertibleMIME(aRequest.contentType)) {
				if (MCE.prefs.getPref('pref_auto_convert')) {
					// We auto-convert *ANY* window
					var cBody = MCE.iface.getCBody(aWebProgress.DOMWindow);
					if (cBody) {
						if (cBody.hasAttribute("converter_extension_converted"))
							MCE.iface.restore_status();
						else
							MCE.iface.fullPageAction(aWebProgress.DOMWindow);
					}
					// fullPageAction() and restore_status() take care of the icon
					return;
				}
			}

			// We only update the icons for changes related to the current window
			if (aWebProgress.DOMWindow != gBrowser.contentWindow)
				return;

			// Loading the current window
			if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_START)
				MCE.iface.set_status('LOADING');

			// Finished loading the current window
			if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP)
				MCE.iface.restore_status();
		},

		onStatusChange (aWebProgress, aRequest, aStatus, aMessage) {},

		onSecurityChange (aWebProgress, aRequest, aState) {},
	},

	retrieveURL (url, key, eventHandler) {
		var async = new MCE.async({
				'url': url,
				'key': key,
				'eventHandler': eventHandler
			});
		async.execute();
	},
}

window.addEventListener("load", function load(event) {
	window.removeEventListener("load", load, false); //remove this listener, no longer needed
	MCE.iface.init();
}, false);
