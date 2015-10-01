/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 * Created by Kyriakos Barbounakis<k.barbounakis@gmail.com> on 2014-02-23.
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com
 Anthi Oikonomou anthioikonomou@gmail.com
 All rights reserved.
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of MOST Web Framework nor the names of its
 contributors may be used to endorse or promote products derived from
 this software without specific prior written permission.
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var data = require('./index'), cfg = require('./data-configuration'),
    util = require('util'),
    array = require('most-array'),
    fs = require('fs'),
    path = require('path');
function main()
{
    var args = process.argv;
    if (args.length>2) {
        var arg = args[2];
        switch (arg) {
            case '--migrate':
                migrate(args[3]);
                return;
            case '--generate':
                generate(args[3]);
                return;
            default :
                usage();
                return;
        }
    }
    else {
        usage();
    }

}

function usage()
{
    console.log('Most Web Framework Utility');
    console.log('Usage:');
    console.log('Model Migration');
    console.log('util.js --migrate [model]');
    console.log('Model Generator');
    console.log('util.js --generate [model]');
}

function migrate(name)
{
    data.execute(function(context)
    {
        var model = context.model(name);
        model.migrate(function(err, result)
        {
            if (err) { console.log(err); }
            context.finalize(function() {
                console.log(util.format('%s model migration was completed successfully.', name));
            });
        });
    });
}

function generate(name)
{
    data.execute(function(context)
    {
        var model = context.model(name), dataTypes = cfg.current.dataTypes;
        if (model==null) {
            console.log(util.format('The specified model (%s) cannot be found.', name));
            return;
        }
        //get parent models if any
        var modelBase = model.base();
        if (modelBase)
        //generate parent model
            generate(modelBase.name);
        var s = '/* Most Framework Model Generator */';
        if (modelBase)
            s = s.concat(util.format('\nvar util = require(\'util\'), most = require(\'most-web\'), mdl=require(\'./%s\');',modelBase.name));
        else
            s = s.concat('\nvar util = require(\'util\'), most = require(\'most-web\')');
        s = s.concat('\n/**');
        s = s.concat('\n/* @constructor');

        s = s.concat(util.format('\n/* @augments %s', modelBase!=null ? modelBase.name : 'DataObject' ));
        var fields = model.fields;

        array(fields).each(function(x) {
            //get field type if any
            var dataType = dataTypes[x.type];
            var type = '*';
            if (dataType!=null)
                if (dataType.type)
                    type = dataType.type;
            s = s.concat(util.format('\n* @property {%s} %s',type, x.name));
        });
        s = s.concat('\n*/');
        s = s.concat(util.format('\nfunction %s() { this.__type=\'%s\'; }',model.name, model.name));
        s = s.concat(util.format('\nutil.inherits(%s, %s);',model.name,  modelBase!=null ? 'mdl.'.concat(modelBase.name) : 'most.data.DataObject'));
        s = s.concat(util.format('\n/** @returns {%s} */',model.name));
        s = s.concat(util.format('\nexports.createInstance = function() { return new %s(); }',model.name));
        s = s.concat(util.format('\nexports.%s = %s;',model.name, model.name));
        s = s.concat('\n/* Most Framework Model Generator */');
        s = s.concat('\n/* place your code under this line */');
        //console.log(s);
        var js = path.join(process.cwd(), 'config/models',util.format('/%s.js', model.name));
        if (!fs.existsSync(js)) {
            fs.writeFileSync(js, s);
        }
        console.log(util.format('%s model generation was completed succesfully.', name));
    });
}

main();