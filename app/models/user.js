var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link');
var crypto = require('crypto');

var User = db.Model.extend({
  tableName: 'users',

  links: function(){
    return this.hasMany(Link);
  },

  initialize:function(){
    this.on('creating',function(model, attrs, options){
      var shasum = crypto.createHash('sha1');
      shasum.update(model.get('sha'));
      model.set('sha',shasum.digest('hex'));
    });
  }
});

module.exports = User;
