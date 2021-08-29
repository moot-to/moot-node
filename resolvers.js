const { Op, literal } = require('sequelize')
const fetch = require('node-fetch')

const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/config/config.json')[env];

const me = (req, res) => {
	req.client.get('account/verify_credentials', {}, function(error, account, response){
		if(error){ return res.json(error[0]) }
		return res.json(account)
	})
}

const getTree = async (req, res, next) => {
	var acc_replies = [];
	const getReplies = (repliedTo, seq=0) => {
		return req.models.Moot.findAll({where: { repliedTo }, raw: true})
			.then(_replies => {
				if(seq === 5) { return acc_replies }
				acc_replies = [...acc_replies, ..._replies]
				return Promise.all(_replies.map(reply => getReplies(reply.statusId, seq+1)));
			})
	}

	var root = await req.models.Moot.findOne({where: {statusId: req.params.id}, raw: true})

	if(root === null){
		const tweet = await getTweet(req, res, next, true)
		if(tweet === null){
			return res.json({error: "No tweet."})
		}
		if(tweet.id_str){
			root = await req.models.Moot.create({ uuid: Math.random().toString().replace("0.", ""), statusId: tweet.id_str }, {raw: true});
		}
	}

	if(root.statusId){
		await getReplies(root.statusId);
	}
	return res.json([root, ...acc_replies])
}

const getTweet = (req, res, next, raw=false) => {
	return fetch("https://cdn.syndication.twimg.com/tweet?id="+req.params.id)
		.then(resp => {
			if(resp.status === 404){
				res.json({error: 'Deleted'})
				return null;
			}

			return resp.json()
		}).then(resp => raw ? resp : resp && res.json({
			...resp, favorited: req.session.liked_tweets ? req.session.liked_tweets.includes(req.params.id) : false
		}))
}

const getUUIDStatus = (req, res) => {
	return req.models.Moot.findOne({where: {uuid: req.params.id}}).then(resp => {
		if(resp === null){
			return res.json({error: 'None'})
		}
		res.json({statusId: resp.statusId})
	})
}

const sendTweet = (req, res) => {
	const ctrl_if_not_exists = ["status"].find(required_param => !Object.keys(req.query).includes(required_param));
	if(ctrl_if_not_exists){ return res.json({error: `${ctrl_if_not_exists} cannot be empty`}) }

	/*
		conversation_control: "by_invitation",
		conversation_control	"community"
	*/
	var params = {status: req.query.status}

	const atob = (_) => Buffer.from(_, 'base64').toString('latin1')
	params.status = decodeURIComponent(escape(atob(params.status)));

	if(req.query.repliedTo){
		params.in_reply_to_status_id = req.query.repliedTo;
	}

	if(req.query.fallacyId === 'null'){
		delete req.query.fallacyId;
	}

	req.client.post('statuses/update', params, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		req.models.Moot.create({ statusId: tweet.id_str, ...req.query})
		return res.json(tweet)
	})
}

const sendMoot = async (req, res) => {
	var params = {status: req.query.status}
	const moot = await req.models.Moot.create({uuid: Math.random().toString().replace("0.", "")}, {raw: true})

	const atob = (_) => Buffer.from(_, 'base64').toString('latin1')
	params.status = decodeURIComponent(escape(atob(params.status)));
	params.status = `${params.status}

	${config.redirectAfterLogin}/r/${moot.uuid}	
	`;

	req.client.post('statuses/update', params, function (error, tweet, response){
		if(error){
			req.models.Moot.destroy({where: {id: moot.id}})
			return res.json(error[0])
		}
		req.models.Moot.update({statusId: tweet.id_str}, {where: {id: moot.id}})
		return res.json(tweet)
	})
}

const likeTweet = (req, res) => {
	req.client.post('favorites/create', {id: req.params.id}, function (error, tweet, response){
		req.session.liked_tweets = [...req.session.liked_tweets, req.params.id];
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
}

const dislikeTweet = (req, res) => {
	req.client.post('favorites/destroy', {id: req.params.id}, function (error, tweet, response){
		req.session.liked_tweets = req.session.liked_tweets.filter(id => id !== req.params.id);
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
}

const random = async (req, res) => {
	const moot = await req.models.Moot.findOne({attributes: ['statusId'], order: literal('rand()'), where: {repliedTo: null, statusId: {[Op.not]: null}}, raw: true});
	return res.json(moot)
}

const logout = (req, res) => {
	req.session.destroy(function(err){
		if(err) {
			return res.json({error: "An error occured"});
		}else {
			req.session = null;
			res.json({error: "Logged out"});
		}
	})
}

const insertFallacy = async (req, res) => {
	const fallacy = await req.models.Fallacy.create({name: req.query.name, source: req.query.source})
	res.json({status: 'OK'})
}

const getFallacies = (req, res) => {
	req.models.Fallacy.findAll().then(resp => {
		return res.json(resp)
	})
}

const mainStatuses = async (req, res) => {
	const statuses = await req.models.Moot.findAll({limit: 5, order: literal('rand()'), where: {repliedTo: null, statusId: {[Op.not]: null}}, raw: true});
	res.json(statuses)
}

module.exports = {
	me,
	getTweet,
	getUUIDStatus,
	getTree,
	sendTweet,
	sendMoot,
	likeTweet,
	dislikeTweet,
	random,
	logout,
	insertFallacy,
	getFallacies,
	mainStatuses
}
