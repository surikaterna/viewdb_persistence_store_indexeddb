var Promise = require('bluebird');
var Collection = require('./collection');


var Store = function(idb) {
	this._idb = idb;
	this._collections = {};
}

Store.prototype.open = function(callback) {
	var self = this;
	var request = this._idb.open('vdb', 1);
	return new Promise(function(resolve, reject) {
		request.onsuccess = function(event) {
			self._db = event.target.result;
			resolve(self);
		}
		request.onupgradeneeded = function(event) {
			var db = event.target.result;
			self._documents = db.createObjectStore('documents', {keyPath: '_id', unique: true});
			self._documents.createIndex('$collection', '$collection', {unique:false});
			//self._documents.createIndex('streamIdCommitSequence', 'streamIdCommitSequence', {unique:true});
			//db.createObjectStore('commits', {keyPath: 'id'});
		}
		request.onerror = function(event) {
			reject(new Error(event));
		}
		request.onblocked = function(event) {
			reject(new Error(event));
		}
	}).nodeify(callback);
}

Store.prototype.collection = function(name, callback) {
	var collection = this._collections[name];
	if(!collection) {
		collection = this._collections[name] = new Collection(this._db, name);
	}
	if(callback) {
		callback(collection);
	}
	return collection;
}

module.exports = Store;