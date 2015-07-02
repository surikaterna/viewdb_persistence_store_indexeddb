var should = require('should');

var Store = require('../lib/store');
var Collection = require('../lib/collection');
var getDb = require('./util');

describe('Collection', function() {
	it('#find with empty array should return 0 docs', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').find({}).toArray(function(err, results) {
				results.length.should.equal(0);
				done();
			});
		});
	});
	it('#insert two documents with same key should throw', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').insert({_id:'echo'});
			store.collection('dollhouse').insert({_id:'echo'}, function(err, result) {
				if(err) {
					done();
				} else {
					done(new Error('should have thrown unique constraint'));
				}
			});
		});
	});	
	it('#insert two documents with same key but in different collections should work', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').insert({_id:'echo'});
			store.collection('dollhouse2').insert({_id:'echo'}, function(err, result) {
				if(err) {
					console.log(err);
					done(new Error('should not have thrown unique constraint'));
				} else {
					done();
				}
			});
		});
	});	

	it('#update documents already existing', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').insert({_id:'echo'});
			store.collection('dollhouse').save({_id:'echo', version:2});
			store.collection('dollhouse').find({}).toArray(function(err, results) {
				results.length.should.equal(1);
				results[0].version.should.equal(2);
				done();
			});
		});
	});	
	it('#find {} should return single inserted document', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').insert({_id:'echo'});
			store.collection('dollhouse').find({}).toArray(function(err, results) {
				results.length.should.equal(1);
				done();
			});
		});
	});
	it('#find {} should return multiple inserted documents', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').insert({_id:'echo'});
			store.collection('dollhouse').insert({_id:'sierra'});
			store.collection('dollhouse').find({}).toArray(function(err, results) {
				results.length.should.equal(2);
				done();
			});
		});
	});
	it('#find {_id:"echo"} should return correct document', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').insert({_id:'echo'});
			store.collection('dollhouse').insert({_id:'sierra'});
			store.collection('dollhouse').find({_id:'echo'}).toArray(function(err, results) {
				results.length.should.equal(1);
				results[0]._id.should.equal('echo');
				done();
			});
		});
	});	
	it('#find with complex key {"name.first":"echo"} should return correct document', function(done) {
		var store = new Store(getDb());
		store.open().then(function() {
			store.collection('dollhouse').insert({_id:'echo', name:{first:'ECHO', last:"TV"}});
			store.collection('dollhouse').insert({_id:'sierra', name:{first:'SIERRA', last:"TV"}});
			store.collection('dollhouse').find({"name.first":'ECHO'}).toArray(function(err, results) {
				results.length.should.equal(1);
				results[0]._id.should.equal('echo');
				done();
			});
		});
	});		
})