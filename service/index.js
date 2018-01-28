/* globals Promise */
/* eslint-disable fp/no-mutation, fp/no-throw */

const { json } = require('micro')

const cors = require('micro-cors')({
	allowedMethods: ['POST']
})

const aws = require('aws-sdk')

const policyGen = require('s3-post-policy')

const S3 = new aws.S3({ 
    region: process.env.BUCKET_REGION || 'ap-southeast-2' 
})

const getPolicy = ({ filename, filetype }) => policyGen({
    id: process.env.AWS_ACCESS_KEY_ID
    ,region: 'ap-southeast-2'
    ,bucket: 'uploads.harth.io'
    ,secret: process.env.AWS_SECRET_ACCESS_KEY
    ,date: Date.now()
    ,policy:
        { expiration: Date.now() + 60 * 1000 * 5
        , conditions: 
            [ ["starts-with", "$key", ""]
            , ["starts-with", "$Content-Type", ""]
            , ["content-length-range", 0, 5 * 1024 * 1024 ] 
            , {"acl": "private"}
            ] 
        }
})
    

const rateLimit = handler => require('micro-ratelimit')({
	window: 1000
	, limit: 2 // 2 a second per client
	, headers: true
}, handler)


async function createSignedURL(req){
    const { filename, filetype } = await json(req)

	if( !filename ) {
		const error = new Error(
			'A filename parameter was expected.'
		)
		error.statusCode = 400
		throw error
    }

    const url = await new Promise( (Y,N) => 
        S3.getSignedUrl(
            'putObject', 
            { Bucket: 'uploads.harth.io'
            , Key: filename 
            , ContentType: filetype
            }
            , (err, data) => err ? N(err) : Y(data)
        )
    )
    
    return { url }
}

async function createPostPolicy(req){
    const { filename, filetype } = await json(req)
    return getPolicy({filename, filetype})
}

async function getFile(req){
    
    const { file_id } = require('url').parse(req.url, true)
        .query

    if( !file_id ) {
		const error = new Error(
			'A file_id parameter was expected.'
		)
		error.statusCode = 400
		throw error
    }

    return {
        status: Math.random() > 0.5 ? 'processing' : 'processed'
        ,file_id
    }
}

async function unknown(){
    const error = new Error('Unknown request format')
    error.status = '403'
    throw error
}

module.exports = rateLimit( cors(async (req, res) => {

    return (
        req.method == 'GET'
            ? getFile(req, res)
        : req.method == 'POST'
            ? createPostPolicy(req, res)
            : unknown(req, res)
    )
}))
