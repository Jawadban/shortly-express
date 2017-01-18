var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
//var morgan = require('morgan');
//var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
//app.use(morgan('dev'));
//app.use(cookieParser());
app.use(session({
  secret: 'keyboardcat',
  resave: false,
  saveUninitialized: true
}));

// function restrict(req, res, next) {
//   if (req.session.user) {
//     next();
//   } else {
//     //req.session.error = 'Access denied!';
//     res.redirect('/login');
//   }
// }

//http:127.0.0.1:4568/ --> access index.js
app.get('/', util.restrict, function(req, res) {
 // console.log('Home-Page (shortly - line 35): ', req);
  //if it passes restrict - req.session.user - render the home page
  res.render('index');
});

app.get('/create', util.restrict, function(req, res) {
  res.render('index');
});

app.get('/links', util.restrict, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });  
});

app.post('/links', function(req, res) {
  var uri = req.body.url;
  console.log('URL (shortly.js) - line 47: ', uri);
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

//LogIn
app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  var password = req.body.password;

  //if username and pw match, create a sess ID and redirect user to homepage (index)
  //select * from User
  new User({username: req.body.username}).fetch().then(function(user) {
    console.log('shortly - line 116: ', user.get('password'));
    console.log('shortly - line 117: ', user );
    if (user) {
      //bcryp.hash('unencrypted pw', null - generate a salt, null, function (err, hash) )
      //compare the password              
                    //unencrypted pw, encrypted password --> pass these to callback
      bcrypt.compare(password, user.get('password'), function(err, match) {
 
        if (match) {
          req.session.user = user;
          res.redirect('/');
        } else {
          res.end('Bad username or password!');
        }

      });
    } else {
      res.redirect('/login');
    }
  });
});

//SignUp
app.get('/signup', function (req, res) {
  res.render('signup');
});

app.post('/signup', function (req, res) {
  var passWord = bcrypt.hashSync(req.body.password);

      //take in form data info for 'username' and 'password'
  var newUser = new User({
    username: req.body.username, 
    password: passWord
  });

  newUser.save().then(function(newUser) {
    //ADD newUSER to the 
    //'USERS' collection that is based on the 'USER' MODEL
    Users.add(newUser);
    req.session.user = newUser;
    res.redirect('/');
  });
});
//});
//});

//LogOUT
app.get('/logout', function (req, res) {
  console.log('Logging Out the Current User!');
  req.session.user = null;
  res.redirect('/');
  
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
