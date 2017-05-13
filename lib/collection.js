var Promise = require('bluebird');
var _ = require('lodash');
var uuid = require('node-uuid').v4;
var Kuery = require('kuery');
var Cursor = require('viewdb').Cursor;
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Collection = function (db, name) {
  EventEmitter.call(this);
  this._db = db;
  this._name = name;
}

util.inherits(Collection, EventEmitter);

Collection.Cursor = Cursor;

Collection.prototype.find = function (query, options) {
  if (this._isIdentityQuery(query)) {
    var id = query.id;
    return [];
  } else {
    return new Cursor(this, { query: query }, options, this._getDocuments.bind(this));
  }
};

Collection.prototype._getKey = function (document) {
  return this._name + "_" + document['_id'];
}

Collection.prototype.insert = function (document, options, callback) {
  var self = this;
  if (_.isFunction(options)) {
    callback = options;
    options = null;
  }
  if (!_.has(document, '_id')) {
    document['_id'] = uuid();
  }

  return new Promise(function (resolve, reject) {
    var txn = self._db.transaction(['documents'], 'readwrite');
    var docs = txn.objectStore('documents');

    txn.oncomplete = txn.onsuccess = function () {
    }

    txn.onerror = function (event) {
      reject(new Error(event));
    }
    document.$collection = self._name;
    document.$collectionKey = self._getKey(document);
    var request = docs.add(document);
    request.onsuccess = function () {
      self.emit("change", document);
      process.nextTick(function () {
        resolve(document);
      });
    };
    request.onerror = function (event) {
      reject(new Error(event));
    };
  }).nodeify(callback);
}


Collection.prototype.save = function (document, options, callback) {
  var self = this;
  if (_.isFunction(options)) {
    callback = options;
    options = null;
  }

  if (!_.isArray(document)) {
    document = [document];
  }

  if (!_.has(document, '_id')) {
    document['_id'] = uuid();
  }


  return new Promise(function (resolve, reject) {
    var txn = self._db.transaction(['documents'], 'readwrite');
    var docs = txn.objectStore('documents');

    txn.oncomplete = txn.onsuccess = function () {
      self.emit("change", document);
      process.nextTick(function () {
        resolve(document);
      });
    }

    txn.onerror = function (event) {
      reject(new Error(event));
    }
    document.$collection = self._name;
    document.$collectionKey = self._getKey(document);
    var currentIndex = 0;
    function putNext() {
      var request = docs.put(document[currentIndex++]);
      request.onsuccess = function () {
        putNext();
      };
      request.onerror = function (event) {
        reject(new Error(event));
      };
    }

    putNext();

  }).nodeify(callback);
}

Collection.prototype.drop = function (callback) {
  var txn = this._db.transaction(['documents'], 'readwrite');
  var docs = txn.objectStore('documents');
  var cursor = docs.index('$collection').openCursor(this._name);
  cursor.onerror = function (event) {
    if (callback) {
      callback(new Error(event));
    } else {
      console.log(event);
    }
  };
  cursor.onsuccess = function (event) {
    var c = event.target.result;
    if (c) {
      c.delete();
      c.continue();
    } else {
      if (callback) {
        callback(null);
      }
    }
  }
};

Collection.prototype.remove = function (query, options, callback) {
  var self = this;
  if (_.isFunction(options)) {
    callback = options;
    options = null;
  }
  if (!callback) {
    callback = function () {
    };
  }

  this._getDocuments(query, function (err, res) {
    if (err) {
      callback(err);
    } else {
      var txn = self._db.transaction(['documents'], 'readwrite');
      txn.oncomplete = txn.onsuccess = function () {
        callback(null);
      }

      txn.onerror = function (event) {
        callback(new Error(event));
      }
      var docs = txn.objectStore('documents');
      _.forEach(res, function (doc) {
        var key = self._getKey(doc);
        var delReq = docs.delete(key);
        // delReq.onsuccess = delReq.onerror = delReq.oncomplete =  function() {
        // }
      });
    }
  });
};

Collection.prototype._getDocuments = function (query, callback) {
  var qry = query.query || query;
  var txn = this._db.transaction(['documents'], 'readonly');
  var docs = txn.objectStore('documents');
  var cursor = docs.index('$collection').openCursor(this._name);
  var result = [];
  cursor.onerror = function (event) {
    callback(new Error(event));
  };
  cursor.onsuccess = function (event) {
    var c = event.target.result;
    if (c) {
      result.push(c.value);
      c.continue();
    } else {
      var q = new Kuery(qry);
      query.sort && q.sort(query.sort);
      query.skip && q.skip(query.skip);
      query.limit && q.limit(query.limit);
      callback(null, q.find(result));
    }
  }
};

Collection.prototype._isIdentityQuery = function (query) {
  return false;
}


module.exports = Collection;