/* eslint-disable fp/no-mutation, fp/no-throw */

const { json } = require('micro')

const cors = require('micro-cors')({
	allowedMethods: ['POST']
})

const aws = require('aws-sdk')

const S3 = new aws.S3({ 
    region: process.env.BUCKET_REGION || 'ap-southeast-2' 
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

async function getFile(req){
    
    const { file_id } = require('url').parse(req.message.url, true)
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
    
    console.log( req.method )
    
    return (
        req.method == 'GET'
            ? getFile(req, res)
        : req.method == 'POST'
            ? createSignedURL(req, res)
            : unknown(req, res)
    )
}))
