var express = require('express');
var bodyParser = require('body-parser');
var logger = require('express-logger');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var redis = require("redis");
var redisStore = require('connect-redis')(session);
var Twitter = require('twitter');
const cors = require('cors');
const models = require('./models')
const resolvers = require('./resolvers')
const oauthSession = require('./oauth')
var fs = require('fs')

var client = redis.createClient();
var CONSUMER_KEY = process.env.CONSUMER_KEY;
var CONSUMER_SECRET = process.env.CONSUMER_SECRET;

var app = express();

app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(logger({ path: "log/express.log"}));
app.use(cookieParser());
app.use(session({
	secret: process.env.SESSION_SECRET,
	store: new redisStore({ host: 'localhost', port: 6379, client, ttl: 86400 }),
	saveUninitialized: false,
	resave: false
}));

var tokens = fs.readFileSync("./.tokens", "utf8").trim("")
	.split("\n").filter(Boolean).map((line) => line.split(":"))
	.reduce((obj, [access_token, access_secret]) => ({...obj, [access_token]: access_secret}), {});

app.get('/sessions/connect', oauthSession.connectSession);
app.get('/sessions/callback', oauthSession.callbackSession);

const routes = [
	{ alias: 'me', path: '/me', callback: resolvers.me, protected: true },
	{ alias: 'tree', path: '/tree/:id', callback: resolvers.getTree, protected: true },
	{ alias: 'status', path: '/status/:id', callback: resolvers.getTweet },
	{ alias: 'tweet', path: '/tweet', callback: resolvers.sendTweet, protected: true },
	{ alias: 'like', path: '/like/:id', callback: resolvers.likeTweet, protected: true },
	{ alias: 'dislike', path: '/dislike/:id', callback: resolvers.dislikeTweet, protected: true }
];

const protected_routes = routes.filter(route => Boolean(route.protected)).map(route => route.alias);

app.use(function(req, res, next){
	req.models = models;
	req.tokens = tokens;

	const {oauthAccessToken=null, oauthAccessTokenSecret=null} = req.session;
	if(oauthAccessToken === null || oauthAccessTokenSecret === null){
		return res.json({error: "Unauthorized session"})
	}

	const rootpath = req.path.split("/")[1];
	if(protected_routes.includes(rootpath)){
		req.client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: oauthAccessToken, access_token_secret: oauthAccessTokenSecret });
	}
	next();
})

routes.map(route => app.get(route.path, route.callback));

app.listen(8080, function() {
  console.log('App runining on port 8080!');
	models.sequelize.sync()
});
