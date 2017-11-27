import {assert} from 'chai';
import path from 'path';
import util from 'util';
import {DataConfiguration} from './../../data-configuration';
describe('data configuration tests', function() {

    it('should load configuration relative to process.cwd()', function(done) {
        let config = new DataConfiguration();
        assert.equal(config.getConfigurationPath(), path.join(process.cwd(),'config'),'Default configuration path failed');
        util.log(config.getConfigurationPath());
        return done();
    });

    it('should load configuration based on the given path', function(done) {
        let config = new DataConfiguration(path.join(__dirname,'config'));
        assert.equal(config.getConfigurationPath(), path.join(__dirname,'config'),'Configuration path failed');
        util.log(config.getConfigurationPath());
        return done();
    });

    it('should load model definition', function(done) {
        let config = new DataConfiguration(path.join(__dirname,'config'));
        assert.isObject(config.model('User'),'Model load failed');
        return done();
    });

    it('should use module loader', function(done) {
        let config = new DataConfiguration(path.join(__dirname,'config'));
        var Person = config.getModuleLoader().require('./models/person-model.js');
        assert.isFunction(Person,'Class load failed');
        return done();
    });

});