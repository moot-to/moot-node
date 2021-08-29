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

var client = redis.createClient();
var CONSUMER_KEY = process.env.CONSUMER_KEY;
var CONSUMER_SECRET = process.env.CONSUMER_SECRET;

var app = express();

app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
	secret: process.env.SESSION_SECRET,
	store: new redisStore({ host: 'localhost', port: 6379, client, ttl: 86400 }),
	saveUninitialized: false,
	resave: false
}));

app.get('/sessions/connect', oauthSession.connectSession);
app.get('/sessions/callback', oauthSession.callbackSession);

const routes = [
	{ alias: 'me', path: '/me', callback: resolvers.me, protected: true },
	{ alias: 'tree', path: '/tree/:id', callback: resolvers.getTree },
	{ alias: 'status', path: '/status/:id', callback: resolvers.getTweet },
	{ alias: 'uuid-status', path: '/uuid-status/:id', callback: resolvers.getUUIDStatus },
	{ alias: 'tweet', path: '/tweet', callback: resolvers.sendTweet, protected: true },
	{ alias: 'moot', path: '/moot', callback: resolvers.sendMoot, protected: true },
	{ alias: 'like', path: '/like/:id', callback: resolvers.likeTweet, protected: true },
	{ alias: 'dislike', path: '/dislike/:id', callback: resolvers.dislikeTweet, protected: true },
	{ alias: 'random', path: '/random', callback: resolvers.random },
	{ alias: 'fallacies', path: '/fallacies', callback: resolvers.getFallacies },
	{ alias: 'insertFallacy', path: '/insertfallacy', callback: resolvers.insertFallacy },
	{ alias: 'mainStasuses', path: '/mainStatuses', callback: resolvers.mainStatuses },
	{ alias: 'logout', path: '/logout', callback: resolvers.logout, protected: true },
];

const protected_routes = routes.filter(route => Boolean(route.protected)).map(route => route.alias);

app.use(function(req, res, next){
	req.models = models;

	const rootpath = req.path.split("/")[1];
	if(protected_routes.includes(rootpath)){
		const {oauthAccessToken=null, oauthAccessTokenSecret=null} = req.session;
		if(oauthAccessToken === null || oauthAccessTokenSecret === null){
			return res.json({error: "Unauthorized session"})
		}
		req.client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: oauthAccessToken, access_token_secret: oauthAccessTokenSecret });
	}

	next();
})

routes.map(route => app.get(route.path, route.callback));

app.listen(8080, function() {
  console.log('App runining on port 8080!');
	models.sequelize.sync()
});
