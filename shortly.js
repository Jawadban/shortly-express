var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
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

//http:127.0.0.1:4568/ --> access index.js
app.get('/', function(req, res) {
  console.log('Home-Page (shortly - line 35): ', req);
  //check to see if a user session is available     
  if (util.checkUser(req)) {
    res.render('index');
  } else {
    res.redirect('/login');
    res.render('login');
  }
});

app.get('/create', function(req, res) {
  if (util.checkUser(req)) {
    res.render('/create');
  } else {
    res.redirect('/login');
    res.render('login');
  }
});

app.get('/links', function(req, res) {
  if (!util.checkUser(req)) {
    res.redirect('/login');
    //res.render('login');
  } else {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });  
  }
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
  if (util.checkUser(req)) {
    res.redirect('/');
  } else {
    res.render('login');
  }
});

app.post('/login', function (req, res) {
  var password = req.body.password;

  //if username and pw match, create a sess ID and redirect user to homepage (index)
  //select * from User
  new User({username: req.body.username/*, password: req.body.password*/}).fetch().then(function(found) {
    if (found) {
      //bcrypt code HERE - bcrpytCompare????
      bcrypt.compare(password, found.get('password'), function(err, match) {
        if (match) {
          req.session.user = found;
          res.redirect('/');
        } else {
          res.end('Bad username or password!');
        }

      });
    } else {
      console.log(req.body.username);
      res.redirect('/signup');
    }
  });
});

//SignUp
app.get('/signup', function (req, res) {
  if (util.checkUser(req)) {
    res.redirect('/');
  } else {
    res.render('signup');
  }
});

app.post('/signup', function (req, res) {
  //select * from User where username = 'username (entered on the form in '/signup' page' 
  new User({username: req.body.username/*, password: req.body.password*/}).fetch().then(function(found) {
    //user is already taken!
    res.redirect('/signup');
    if (found) {
      console.log('User exists already');
    } else {

      var passWord = req.body.password;
      console.log('Entered Password: ', passWord);

      bcrypt.hash(passWord, null, null, function (err, hash) {
        //store hash in password db
        passWord = hash;
        console.log('Hashed password is: ', passWord);
      });

      //take in form data info for 'username' and 'password'
      var newUser = new User({
        username: req.body.username, 
        password: req.body.password
      });

      newUser.save().then(function(newUser) {
        //ADD newUSER to the 
        //'USERS' collection that is based on the 'USER' MODEL
        Users.add(newUser);
        req.session.user = newUser;
        res.redirect('/');
      });
    }
  });
});

//LogOUT
app.get('/logout', function (req, res) {
  res.redirect('/');
  res.render('index');
  console.log('Logging Out User !');
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
