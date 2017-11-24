var assert = require('chai').assert;
var FunctionConfiguration = require("../../odata").FunctionConfiguration;
var EdmMapping = require('../../odata').EdmMapping;
var EdmType = require('../../odata').EdmType;
var defineDecorator = require('../../odata').defineDecorator;

describe('edm mapping test', function() {

    function Rectangle(height, width) {
        this.height = height;
        this.width = width;
    }
    Rectangle.prototype.getArea = function() {
        return this.height * this.width;
    };
    defineDecorator(Rectangle.prototype, 'getArea', EdmMapping.func('Area',EdmType.EdmDouble));

   it('should get instance member marked as entity type function', function(done) {
       var rect = new Rectangle(1.5,2);
       var func = EdmMapping.hasOwnFunction(rect,'Area');
       assert.isOk(typeof func === 'function','Expected Function.');
       return done();
   });
    it('should not find instance member marked as entity type function', function(done) {
        var rect = new Rectangle(1.5,2);
        var func = EdmMapping.hasOwnFunction(rect,'Some');
        assert.isOk(typeof func === 'undefined','Expected null.');
        return done();
    });
});