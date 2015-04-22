var express = require('express');
var app = express();
var session = require('express-session');
var fs = require('fs');
var hash = require('./pass').hash;

app.use(session({cookie: {
  path    : '/',
  httpOnly: false,
  maxAge  : 24*60*60*1000
},secret:'secret'}));
app.use(express.static(__dirname + '/public'));

app.get('/', restrict, function(req,res) {
  res.sendfile('public/client.html');
});


app.get('/control', function(req,res) {
  var data = {time : new Date(), text :'room'};

  io.to(user[req.cookies.user_id]).emit('update', req.query.command);
  res.sendStatus(200);
});

// Session-persisted message middleware

app.use(function(req, res, next){
  var err = req.session.error
      , msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});

// dummy database

var users = {
  zlin: { name: 'zlin' }
};

for(var user in users){
  signup(user, 'aihome');
}

function signup(username, password){
  hash(password, function(err, salt, hash){
    if (err) throw err;
    // store the salt & hash in the "db"
    users[username].salt = salt;
    users[username].hash = hash.toString();
  });
}




// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {
  if (!module.parent) console.log('authenticating %s:%s', name, pass);
  var user = users[name];
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash(pass, user.salt, function(err, hash){
    if (err) return fn(err);
    if (hash.toString() == user.hash) return fn(null, user);
    fn(new Error('invalid password'));
  })
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

//app.get('/', function(req, res){
//  res.redirect('login');
//});

app.get('/restricted', restrict, function(req, res){
  res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});

app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
});

app.get('/login', function(req, res){
  res.sendFile('public/login.html', {root:__dirname});
});

app.post('/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation
      req.session.regenerate(function(){
        // Store the user's primary key
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.name
        + ' click to <a href="/logout">logout</a>. '
        + ' You may now access <a href="/restricted">/restricted</a>.';
        res.redirect('/');
      });
    } else {
      req.session.error = 'Authentication failed, please check your '
      + ' username and password.';
      res.redirect('/login');
    }
  });
});


var server = app.listen(8000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

var user ={'8dafe6c1-4092-4a50-ac64-2029b32520e2': 1, 'b54b8986-5c13-460f-895a-46adb656585e': 1};


var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {

  socket.on('join', function(id){
    socket.join(user[id]);
  });

  socket.on('image', function(data){
    fs.writeFile("public/image.png", data.buffer, function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log(data.buffer.length);
        console.log("The file was saved!");
      }
    });
  });

  socket.on('audio', function(data){
    fs.writeFile("public/audio.wav", data.buffer, function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log(data.buffer.length);
        console.log("The file was saved!");
      }
    });
  });

});

