var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link');


var User = db.Model.extend({
  tableName: 'users',

  links: function(){
    return this.hasMany(Link);
  },

  initialize:function(){
    var self = this;
    bcrypt.hash(self.get('sha'), null, null ,function(err,hash){
      if(err){
        return console.error(err);
      }
      self.set('sha',hash);
    });
  }
});

module.exports = User;
