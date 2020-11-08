const express = require('express')
const http = require('http');
const csrf = require("csurf");
const cookieParser =require("cookie-parser");
const bodyParser = require("body-parser");
const WebSocket = require('ws');
const Game = require('./game');
const admin =require("firebase-admin");


var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rummy-8ddbe.firebaseio.com"
});

const csrfMiddleware =csrf({ cookie : true});
const PORT =process.env.PORT || 3000;

const app = express();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const rummy = new Game(wss);


app.use(bodyParser.json());
app.use(cookieParser());
app.use(csrfMiddleware);

// Serve Static Files/Assets
app.engine("html", require("ejs").renderFile);
app.use(express.static('public'));

// Ignore Socket Errors
wss.on('error', () => console.log('*errored*'));
wss.on('close', () => console.log('*disconnected*'));


app.all("*" , (req,res ,next)=> {
res.cookie("XSRF-TOKEN", req.csrfToken());
next();
});


app.get("/login", function (req, res) {
  res.render( __dirname + "/public/login.html");
});

app.get('/signup', function (req, res) {
  res.render(__dirname + "/public/signup.html");
});
/*----------------------ENDPOINTS----------------------*/




app.get('/start', function (req, res) {
  const sessionCookie = req.cookies.session || "";

  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(() => {
      res.render( __dirname + "/public/start.html");
    })
    .catch((error) => {
      res.redirect("/login");
    });
});
app.get('/join/:lobby', (req, res) => {
  let code = req.params.lobby;
  if (rummy.addLobby(code)) {
    const sessionCookie = req.cookies.session || "";

  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(() => {
      res.redirect('/game/' + req.params.lobby + '/' + rummy.lobbys[code].token);
    })
    .catch((error) => {
      res.redirect("/login");
    });
    
  } else {
    res.redirect('/');
  }
});

app.get('/joincpu/:lobby', (req, res) => {
  let code = req.params.lobby;
  if (rummy.addLobby(code, cpu=true)) {
    const sessionCookie = req.cookies.session || "";

  admin
    .auth()
    .verifySessionCookie(sessionCookie, true /** checkRevoked */)
    .then(() => {
      res.redirect('/game/' + req.params.lobby + '/' + rummy.lobbys[code].token);
    })
    .catch((error) => {
      res.redirect("/login");
    });
    




    
   
  } else {
    res.redirect('/');
  }
});

app.get('/game/:lobby/:token', (req, res) => {
  let code = "" + req.params.lobby,
      token = req.params.token;
  if (req.params.token && rummy.lobbys[code] && rummy.lobbys[code].token == token) {
    res.sendFile(__dirname + '/public/game.html');
  } else {
    res.redirect('/');
  }
});
/*-----------------------------------------------------*/




app.post("/sessionLogin", (req, res) => {
  const idToken = req.body.idToken.toString();

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  admin
    .auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      (sessionCookie) => {
        const options = { maxAge: expiresIn, httpOnly: true };
        res.cookie("session", sessionCookie, options);
        res.end(JSON.stringify({ status: "success" }));
      },
      (error) => {
        res.status(401).send("UNAUTHORIZED REQUEST!");
      }
    );
});

app.get("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/login");
});
// Start Server
server.listen(5000, () => {
  console.log('Listening on port 5000...')
});
