var express = require('express');
var bodyParser = require('body-parser');
var logger = require('express-logger');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var inspect = require('util-inspect');
var oauth = require('oauth');
var Twitter = require('twitter');
var fs = require('fs')
const cors = require('cors');
const fetch = require('node-fetch')

var app = express();
app.use(cors());
app.options('*', cors());

var tokens = fs.readFileSync("./.tokens", "utf8").trim("")
	.split("\n")
	.filter(Boolean)
	.map((line) => line.split(":"))
	.reduce((obj, [access_token, access_secret]) => ({...obj, [access_token]: access_secret}), {});

const saveToken = (access_token, access_secret) => {
	tokens = {...tokens, [access_token]: access_secret}
	fs.writeFileSync(".tokens", Object.entries(tokens).map(([key, val]) => `${key}:${val}`).join("\n"))
}

var CONSUMER_KEY = process.env.CONSUMER_KEY;
var CONSUMER_SECRET = process.env.CONSUMER_SECRET;

var consumer = new oauth.OAuth("https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token", 
    CONSUMER_KEY, CONSUMER_SECRET, "1.0A", "http://127.0.0.1:8080/sessions/callback", "HMAC-SHA1");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(logger({ path: "log/express.log"}));
app.use(cookieParser());
app.use(session({ secret: "458403d53cdd2896ed3de", resave: false, saveUninitialized: true}));

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

app.get('/sessions/connect', function(req, res){
  consumer.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){
    if (error) {
      res.send("Error getting OAuth request token : " + inspect(error), 500);
    } else {  
			req.session.oauthRequestToken = oauthToken;
			req.session.oauthRequestTokenSecret = oauthTokenSecret;
      res.redirect("https://twitter.com/oauth/authorize?oauth_token="+req.session.oauthRequestToken);      
    }
  });
});

app.get('/sessions/callback', function(req, res){
  consumer.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
    if (error) {
      res.send("Error getting OAuth access token : " + inspect(error) + "[" + oauthAccessToken + "]" + "[" + oauthAccessTokenSecret + "]" + "[" + inspect(res) + "]", 500);
    } else {
			req.session.oauthAccessToken = oauthAccessToken;
			req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
			saveToken(oauthAccessToken, oauthAccessTokenSecret)
      res.json({oauth_access_token: oauthAccessToken});
    }
  });
});

app.get('/me', function(req, res){
	const token = req.query.token;
	if(Boolean(token) === false || Boolean(Object.keys(tokens).includes(token)) === false){
		return res.json({error: "Unauthorized token."})
	}

	var client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: token, access_token_secret: tokens[token] });
	client.get('account/verify_credentials', {}, function(error, account, response){
		if(error){ return res.json(error[0]) }
		return res.json(account)
	})
});

app.get('/tweet/:status', function(req, res){
	const token = req.query.token;
	if(Boolean(token) === false || Boolean(Object.keys(tokens).includes(token)) === false){
		return res.json({error: "Unauthorized token."})
	}

	var client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: token, access_token_secret: tokens[token] });
	client.post('statuses/update', {status: req.query.status}, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
});

app.get('/like/:id', function(req, res){
	const token = req.query.token;
	if(Boolean(token) === false || Boolean(Object.keys(tokens).includes(token)) === false){
		return res.json({error: "Unauthorized token."})
	}

	var client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: token, access_token_secret: tokens[token] });
	client.post('favorites/create', {id: req.params.id}, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
});

app.get('/dislike/:id', function(req, res){
	const token = req.query.token;
	if(Boolean(token) === false || Boolean(Object.keys(tokens).includes(token)) === false){
		return res.json({error: "Unauthorized token."})
	}

	var client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: token, access_token_secret: tokens[token] });
	client.post('favorites/destroy', {id: req.params.id}, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
});

app.get('/tweet', function(req, res){
	const token = req.query.token;
	if(Boolean(token) === false || Boolean(Object.keys(tokens).includes(token)) === false){
		return res.json({error: "Unauthorized token."})
	}

	var client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: token, access_token_secret: tokens[token] });
	client.post('statuses/update', {status: req.query.status}, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
});

app.get('/status2/:id', function(req, res){
	const token = req.query.token;
	if(Boolean(token) === false || Boolean(Object.keys(tokens).includes(token)) === false){
		return res.json({error: "Unauthorized token."})
	}

	var client = new Twitter({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET, access_token_key: token, access_token_secret: tokens[token] });
	client.get('statuses/show', {id: req.params.id, include_entities: true}, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
});

app.get('/status/:id', function(req, res){
	fetch("https://cdn.syndication.twimg.com/tweet?id="+req.params.id)
		.then(resp => resp.json()).then(resp => res.json(resp))
})

app.listen(8080, function() {
  console.log('App runining on port 8080!');
});
