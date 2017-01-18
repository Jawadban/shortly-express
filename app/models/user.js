var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true

  //BOOKSHELF - pass the data into the database 
  //password and username
   
});

module.exports = User;