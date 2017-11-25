import {assert} from 'chai';
import util from 'util';
import {EdmMapping,EdmType,EdmMultiplicity,ActionConfiguration,FunctionConfiguration} from '../../odata';
describe('edm mapping test', function() {
    @EdmMapping.entityType("Rectangle")
    class Rectangle {
        constructor(height,width) {
            this.height = height;
            this.width = width;
        }

        @EdmMapping.param('width',EdmType.EdmDouble)
        @EdmMapping.param('height',EdmType.EdmDouble)
        @EdmMapping.action('Create',"Rectangle")
        static create(height, width) {
            return new Rectangle(height, width);
        }

        @EdmMapping.param('times',EdmType.EdmDouble)
        @EdmMapping.param('rect',"Rectangle")
        @EdmMapping.action('Enlarge',"Rectangle")
        static enlarge (rect, times) {
            rect.height = rect.height * times;
            rect.width = rect.width * times;
            return rect;

        }

        @EdmMapping.func('Random',"Rectangle")
        static getRandom() {
            return new Rectangle(2, 3);
        }

        @EdmMapping.param('width',EdmType.EdmDouble)
        @EdmMapping.param('height',EdmType.EdmDouble)
        @EdmMapping.action('Resize',"Rectangle")
        resize(height,width) {
            this.height = height;
            this.width = width;
            return this;
        }

        @EdmMapping.param('times',EdmType.EdmDouble)
        @EdmMapping.action('Enlarge',"Rectangle")
        enlarge(times) {
            return Rectangle.enlarge(this, times);
        }

        @EdmMapping.func('Area',EdmType.EdmDouble)
        getArea() {
            return this.height * this.width;
        }

        @EdmMapping.func('Description',EdmType.EdmString)
        getDescription() {
            return this.height.toString() + "x" + this.width.toString();
        }

    }

    it('should get instance member marked as entity type function', function(done) {
        let rect = new Rectangle(1.5,2);
        let func = EdmMapping.hasOwnFunction(rect,'Area');
        assert.isOk(typeof func === 'function','Expected Function.');
        //case insensitive search
        func = EdmMapping.hasOwnFunction(rect,'aRea');
        assert.isOk(typeof func === 'function','Expected Function.');
        return done();
    });

    it('should get static member marked as entity type function', function(done) {
        let member = EdmMapping.hasOwnFunction(Rectangle,'Random');
        assert.isOk(typeof member === 'function','Expected Function.');
        assert.isOk(member.functionDecorator instanceof FunctionConfiguration,'Expected FunctionConfiguration');
        util.log(JSON.stringify(member.functionDecorator, null, 4));
        return done();
    });

    it('should get static member marked as entity type action', function(done) {
        let member = EdmMapping.hasOwnAction(Rectangle,'Create');
        assert.isOk(typeof member === 'function','Expected EdmMapping.action decorator.');
        assert.isOk(member.actionDecorator instanceof ActionConfiguration,'Expected ActionConfiguration');
        util.log(JSON.stringify(member.actionDecorator, null, 4));
        return done();
    });

    it('should not find instance member marked as entity type function', function(done) {
        let rect = new Rectangle(1.5,2);
        let member = EdmMapping.hasOwnFunction(rect,'Some');
        assert.isOk(typeof member === 'undefined','Expected null.');
        return done();
    });

    it('should get instance member marked as entity type action', function(done) {
        let rect = new Rectangle(1.5,2);
        let member = EdmMapping.hasOwnAction(rect,'Resize');
        assert.isOk(typeof member === 'function','Expected Function.');
        //case insensitive search
        member = EdmMapping.hasOwnAction(rect,'resize');
        assert.isOk(typeof member === 'function','Expected Function.');
        //validate parameters
        assert.isArray(member.actionDecorator.parameters,'Expected array of parameters');
        assert.equal(member.actionDecorator.parameters.length, 2,'Expected two parameters');
        assert.equal(member.actionDecorator.parameters[0].name, 'height','Invalid parameter name');
        assert.equal(member.actionDecorator.parameters[0].type, 'Edm.Double','Invalid parameter type');
        assert.isUndefined(member.actionDecorator.parameters[0].returnType, 'Invalid parameter return type to be null');
        util.log(JSON.stringify(member.actionDecorator, null, 4));
        return done();
    });

    it('should get collection of static member marked as entity type actions', function(done) {
        let members = EdmMapping.getOwnActions(Rectangle);
        assert.isArray(members,'Expected array of decorators.');
        assert.equal(members.length, 2,'Expected two parameters');
        util.log(JSON.stringify(members, null, 4));
        return done();
    });

    it('should get collection of instance member marked as entity type functions', function(done) {
        let members = EdmMapping.getOwnFunctions(Rectangle.prototype);
        assert.isArray(members,'Expected array of decorators.');
        assert.equal(members.length, 2,'Expected two parameters');
        util.log(JSON.stringify(members, null, 4));
        return done();
    });
    it('should parse multiplicity attribute', function(done) {
        let parsedValue = EdmMultiplicity.parse("zeroOrOne");
        assert.equal(parsedValue, EdmMultiplicity.ZeroOrOne,'Expected valid multiplicy attribute');
        util.log("Parsed Value=" + parsedValue);
        return done();
    });



});