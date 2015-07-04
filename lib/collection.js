var Promise = require('bluebird');
var _ = require('lodash');
var uuid = require('node-uuid').v4;
var Kuery = require('kuery');
var Cursor = require('viewdb').Cursor;
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Collection = function(db, name) {
	EventEmitter.call(this);
	this._db = db;
	this._name = name;
}

util.inherits(Collection, EventEmitter);

Collection.Cursor = Cursor;

Collection.prototype.find = function(query, options) {
	if(this._isIdentityQuery(query)) {
		var id = query.id;
		return [];
	} else {
		return new Cursor(this, query, options, this._getDocuments.bind(this));
	}
};

Collection.prototype.insert = function(document, options, callback) {
	var self = this;
	if(_.isFunction(options)) {
		callback = options;
		options = null;
	}
		if(!_.has(document, '_id')) {
			document['_id'] = uuid();
		}
//		console.log("Inserting document: " + document['_id']);

	return new Promise(function(resolve, reject) {
		var txn = self._db.transaction(['documents'], 'readwrite');
		var docs = txn.objectStore('documents');

		txn.oncomplete = txn.onsuccess = function() {
		}

		txn.onerror = function(event) {
			reject(new Error(event));
		}
		document.$collection = self._name;
		document.$collectionKey = self._name+"_" + document['_id'];
		var request = docs.add(document);
		request.onsuccess = function() {
			self.emit("change", document);
			process.nextTick(function() {
				resolve(document);
			});
		};
		request.onerror = function(event) {
			reject(new Error(event));
		};
	}).nodeify(callback);
}



Collection.prototype.save = function(document, options, callback) {
	var self = this;
	if(_.isFunction(options)) {
		callback = options;
		options = null;
	}

		if(!_.has(document, '_id')) {
			document['_id'] = uuid();
		}


	return new Promise(function(resolve, reject) {
		var txn = self._db.transaction(['documents'], 'readwrite');
		var docs = txn.objectStore('documents');

		txn.oncomplete = txn.onsuccess = function() {
		}

		txn.onerror = function(event) {
			reject(new Error(event));
		}
		document.$collection = self._name;
		document.$collectionKey = self._name+"_" + document['_id'];
		var request = docs.put(document);
		request.onsuccess = function() {
			self.emit("change", document);
			process.nextTick(function() {
				resolve(document);
			});
		};

		request.onerror = function(event) {

			reject(new Error(event));
		};
	}).nodeify(callback);
}




Collection.prototype._getDocuments = function(query, callback) {
	var txn = this._db.transaction(['documents'], 'readonly');
	var docs = txn.objectStore('documents');
	var cursor = docs.index('$collection').openCursor(this._name);
	var result = [];
	cursor.onerror = function(event) {
		callback(new Error(event));
	};
	cursor.onsuccess = function(event) {
		var c = event.target.result;
		if(c) {
			result.push(c.value);
			c.continue();
		} else {
			//get indexeddb to sort?
			var q = new Kuery(query);
			callback(null, q.find(result));
		}
	}
};

Collection.prototype._isIdentityQuery = function(query) {
	return false;
}


module.exports = Collection;	