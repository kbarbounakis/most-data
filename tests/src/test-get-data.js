import {DataConfiguration} from './../../data-configuration';
import {DefaultDataContext} from './../../data-context';
import path from 'path';
import util from 'util';
describe('test data query validation', function() {

    const config = new DataConfiguration(path.resolve(__dirname, "./config"));

    /**
     * @augments {DefaultDataContext}
     */
    class TestDataContext extends DefaultDataContext {
        constructor() {
            super();
        }
        getConfiguration() {
            return config;
        }
    }

    /**
     * @type TestDataContext
     */
    let context;
    before(function(done) {
        context = new TestDataContext();
        return done();
    });

    after(function(done) {
        return context.finalize(function() {
            return done();
        });
    });

   it ('should validate where', function(done) {
       context.model("Person").where("user").equal(-40).silent().getItem().then(function(result) {
           util.log(JSON.stringify(result,null,2));
           return done();
       }).catch(function(err) {
           return done(err);
       });
   });
});