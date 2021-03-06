var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bcrypt = require('bcrypt-nodejs');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser())
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser('5347869erghlkj348907dgfhiluA%'));
  app.use(express.session());
});

app.get('/login', function(req, res){
  res.render('login');
});

//get user login credentials and check against user table
app.post('/login', function(req, res){
  new User({name : req.body.username}).fetch().then(function(model){
    //model undefined?
    if(!model){
      // yes --> redirect to login
      console.log("login failed, redirecting");
      res.redirect('/login');
    } else {
      // no --> hash password
      var hash = model.get('sha');
        // compare to sha
      bcrypt.compare(req.body.password, hash, function(err,verified){
          // equal --> redirect to index
        if(verified){
          req.session.regenerate(function(){
            req.session.user = model.get('name');
            res.redirect('/');
          });
          // !equal --> redirect to login
        } else {
          res.redirect('/login');
        }
      });
    }
  });
});

app.get('/signup', function(req, res){
  res.render('signup');
});

//alter this to take post requests from existing sign up page
app.post('/signup',function(req,res){
  var user = new User({
    name: req.body.name,
    sha: req.body.colloquialism
  });
  console.log('created new user');
  //do lookup by userName, if exists, then alert user and redirect to signup
  new User({name: req.body.name}).fetch().then(function(err,model){
    if(err){return console.error(err);}
    if(!!model){
      res.redirect('/signup');
    } else {
      user.save().then(function(newUser){
        res.send(201);
      });
    }
  });
});

app.get('/logout',util.userLoggedIn, function(req,res){
  req.session.destroy(function(){
    res.redirect('/login');
  });
});

app.get('/', util.userLoggedIn, function(req, res) {
  res.render('index');
});

app.get('/create', util.userLoggedIn, function(req, res) {
  res.render('index');
});

app.get('/links', util.userLoggedIn, function(req, res) {
  new User({name:req.session.user}).fetch().then(function(model){
    Links.reset().query(function(qb){qb.where('user_id', '=', model.get('id'))}).fetch().then(function(links){
      if(!!links){
        res.send(200,links.models);
      }
    });
  });
});

app.post('/links', util.userLoggedIn, function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }
        //fetch row of current user and set url.user_id = to user's id
        new User({name: req.session.user}).fetch().then(function(model){
          var link = new Link({
            url: uri,
            title: title,
            base_url: req.headers.origin,
            user_id: model.get('id')
          });
          link.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      });
    }
  });
});




/************************************************************/
// Write your authentication routes here
/************************************************************/



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
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
