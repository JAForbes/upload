/* eslint-disable fp/no-mutation, fp/no-throw */

const { json } = require('micro')

const cors = require('micro-cors')({
	allowedMethods: ['POST']
})

// require('dotenv').config()

const rateLimit = handler => require('micro-ratelimit')({
	window: 1000 * 60
	, limit: 2 // 2 a minute per client
	, headers: true
}, handler)


module.exports = rateLimit( cors(async (req, res) => {
	const body = await json(req)

	if( !body.filename || typeof body.filename !== 'string' ) {
		const error = new Error(
			'An filename parameter was expected.'
		)
		error.statusCode = 400
		throw error
	}

    
    res.send('http://pretend-signed-url.com/wow')

  	res.end()
}))
