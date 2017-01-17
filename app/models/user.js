var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  //BOOKSHELF - pass the data into the database 
  //password and username
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      bcrypt.hash(model.get(password), null, null, function(err, hash) {
        // Store hash in your password DB
        model.set('password', hash);
      });

      //model.set('password', hash);
    });
  }
});

module.exports = User;