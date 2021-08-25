const { Op } = require('sequelize')
const fetch = require('node-fetch')

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
		root = await req.models.Moot.create({ statusId: tweet.id_str }, {raw: true});
	}

	await getReplies(root.statusId);
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
		}).then(resp => raw ? resp : resp && res.json(resp))
}

const sendTweet = (req, res) => {
	const ctrl_if_not_exists = ["status"].find(required_param => !Object.keys(req.query).includes(required_param));
	if(ctrl_if_not_exists){ return res.json({error: `${ctrl_if_not_exists} cannot be empty`}) }

	var params = {status: req.query.status}
	if(req.query.repliedTo){
		params.in_reply_to_status_id = req.query.repliedTo;
	}

	req.client.post('statuses/update', params, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		req.models.Moot.create({ statusId: tweet.id_str, ...req.query})
		return res.json(tweet)
	})
}

const likeTweet = (req, res) => {
	req.client.post('favorites/create', {id: req.params.id}, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
}

const dislikeTweet = (req, res) => {
	req.client.post('favorites/destroy', {id: req.params.id}, function (error, tweet, response){
		if(error){ return res.json(error[0]) }
		return res.json(tweet)
	})
}

module.exports = {
	me,
	getTweet,
	getTree,
	sendTweet,
	likeTweet,
	dislikeTweet
}
