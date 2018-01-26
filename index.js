/* eslint-disable fp/no-mutation, fp/no-throw */

const { json } = require('micro')

const cors = require('micro-cors')({
	allowedMethods: ['POST']
})

const aws = require('aws-sdk')

const S3 = new aws.S3({ 
    region: process.env.BUCKET_REGION || 'us-west-2' 
})


const rateLimit = handler => require('micro-ratelimit')({
	window: 1000 * 60
	, limit: 2 // 2 a minute per client
	, headers: true
}, handler)


module.exports = rateLimit( cors(async (req) => {
	const body = await json(req)

	if( !body.filename || typeof body.filename !== 'string' ) {
		const error = new Error(
			'An filename parameter was expected.'
		)
		error.statusCode = 400
		throw error
    }
    
    const url = await S3.getSignedUrl(
        'putObject', 
        { Bucket: 'uploads.harth.io'
        , Key: filename 
        }
    )
    .promise()
    
    return { url }

}))
