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

	tabSwitched(event) {
		MCE.iface.restore_status();
	},

	tabOpened(event) {
		MCE.iface.monitorTab(gBrowser.getBrowserForTab(event.target));
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
}
