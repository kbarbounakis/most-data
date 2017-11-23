var assert = require('chai').assert;
var util = require('util');
var path = require('path');
var DefaultDataContext = require("../../data-context").DefaultDataContext;
var DataConfiguration = require('../../data-configuration').DataConfiguration;
describe('mappings test', function() {

   var config = new DataConfiguration(path.resolve(__dirname,'config'));
    /**
     * @class
     * @constructor
     * @augments {DefaultDataContext}
     */
   function TestDataContext() {
        TestDataContext.super_.bind(this)();
   }
    util.inherits(TestDataContext, DefaultDataContext);
    TestDataContext.prototype.getConfiguration = function() {
        return config;
    };
   //initialize data configuration
    var context = new TestDataContext();
   it('should find item', function(done) {
       context.model('Person').where('familyName').equal('Rees').silent().getTypedItem().then(function(result) {
          assert.isDefined(result,'Expected result');
          return done();
       }).catch(function (err) {
           return done(err);
       });
   });
});