var assert = require('chai').assert;
var util = require('util');
var path = require('path');
var Q = require('q');
var Table = require('easy-table');
var DefaultDataContext = require("../../data-context").DefaultDataContext;
var DataModel = require("../../data-model").DataModel;
var DataConfiguration = require('../../data-configuration').DataConfiguration;

/**
 * @class
 * @constructor
 * @param {DataConfiguration} config
 * @augments {DefaultDataContext}
 * @extends {DefaultDataContext}
 */
function TestDataContext(config) {
    TestDataContext.super_.bind(this)();
    this.getConfiguration = function() {
        return config;
    };
    this.switchUser = function(user) {
        this.user = {
            "name":user,
            "authenticationType":"Basic"
        };
        return this;
    }
}
util.inherits(TestDataContext, DefaultDataContext);

describe('mappings test', function() {

    var config;
    /**
     * @type {TestDataContext}
     */
    var context;
    /**
     * initializes test context
     */
    before(function(done) {
        config = new DataConfiguration(path.resolve(__dirname,'config'));
        context = new TestDataContext(config);
        //set test context user
        context.switchUser("alexis.rees@example.com");
        return done();
    });
    /**
     * finalizes test context
     */
    after(function(done) {
        if (context) {
            return context.finalize(function() {
                return done();
            });
        }
        return done();
    });

   it('should find item', function(done) {
       context.model('Person').where('familyName').equal('Rees').getTypedItem().then(function(result) {
          Table.log(result);
          assert.equal(result.getType(),'Person', 'Expected type Person');
          assert.isOk(result.getModel() instanceof DataModel,'Expected data model');
          assert.equal(result['id'], result.getId(),'Identifier should be returned from DataObject.getId() function');
          assert.isDefined(result);
          return done();
       }).catch(function (err) {
           return done(err);
       });
   });

    it('should find person by email', function(done) {
        context.model('Person').where('email').contains('daisy').getTypedItem().then(function(result) {
            Table.log(result);
            assert.equal(result.getType(),'Person', 'Expected type Person');
            assert.isOk(result.getModel() instanceof DataModel,'Expected data model');
            assert.equal(result['id'], result.getId(),'Identifier should be returned from DataObject.getId() function');
            assert.isDefined(result);
            return done();
        }).catch(function (err) {
            return done(err);
        });
    });

    it('should find orders for current user', function() {
        context.switchUser('daisy.lambert@example.com');
        return context.model('Order').filter("customer/user eq me()").then(function(q) {
            return q.orderByDescending('orderDate').take(5).getItems().then(function (result) {
                util.log(JSON.stringify(result, null, 4));
               return Q.resolve();
            });
        });
    });

});