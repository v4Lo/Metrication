"use strict";

MCE.async = function(props) {
	this.url = props.url;
	this.key = props.key;
	this.onFinish = props.eventHandler;

	this.onSuccess = function(handler) {
		var result = {
			'clean': true,
			'status': handler.status,
			'responseText': handler.responseText
		};
		this.onFinish(result);
	};

	this.onFailure = function(handler) {
		var result = {
			'clean': false,
			'status': handler.status,
			'statusText': handler.statusText
		};
		this.onFinish(result);
	};

	this.execute = function() {
		handler = new XMLHttpRequest();
		handler.open("POST", this.url, true);
		var params = "key="+encodeURIComponent(this.key)+"&ver="+MCE.applicationVersion;
		handler.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		handler.setRequestHeader("Content-length", params.length);
		handler.setRequestHeader("Connection", "close");
		self = this;
		handler.addEventListener("load", function(e) { self.onSuccess(handler); self = null; });
		handler.addEventListener("error", function(e) { self.onFailure(handler); self = null; });
		handler.send(params);
	};
}
