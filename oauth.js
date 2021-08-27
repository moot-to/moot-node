var oauth = require('oauth');
var inspect = require('util-inspect');

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config/config.json')[env];

var CONSUMER_KEY = process.env.CONSUMER_KEY;
var CONSUMER_SECRET = process.env.CONSUMER_SECRET;

var consumer = new oauth.OAuth("https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token", 
    CONSUMER_KEY, CONSUMER_SECRET, "1.0A", config.callback, "HMAC-SHA1");

const connectSession = (req, res) => {
  consumer.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){
    if (error) {
      res.send("Error getting OAuth request token : " + inspect(error), 500);
    } else {  
			req.session.oauthRequestToken = oauthToken;
			req.session.oauthRequestTokenSecret = oauthTokenSecret;
      res.redirect("https://twitter.com/oauth/authorize?oauth_token="+req.session.oauthRequestToken);      
    }
  });
}

const callbackSession = (req, res) => {
  consumer.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
    if (error) {
      res.send("Error getting OAuth access token : " + inspect(error) + "[" + oauthAccessToken + "]" + "[" + oauthAccessTokenSecret + "]" + "[" + inspect(res) + "]", 500);
    } else {
			req.session.oauthAccessToken = oauthAccessToken;
			req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
			req.session.liked_tweets = [];
      res.redirect(config.redirectAfterLogin);
    }
  })
}

module.exports = {
	connectSession,
	callbackSession 
}
