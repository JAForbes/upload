/* eslint-disable fp/no-mutation, fp/no-throw */

const { json } = require('micro')
const fs = require('fs')
const path = require('path')

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


async function putFile(req){
    const { filename, filetype } = await json(req)

	if( !filename ) {
		const error = new Error(
			'An filename parameter was expected.'
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

async function getComponent(){
    return fs.createReadStream( path.resolve( __dirname, './ui/index.html') )
}

async function getFile(){
    return {
        status: 'processing'
    }
}

async function unknown(req){
    const error = new Error('Unknown request format')
    error.status = '403'
    throw error
}

module.exports = rateLimit( cors(async (req) => {
    
    return (
        req.method == 'GET'
            ? req.url == '/'
                ? getComponent(req)
            : req.url.startsWith('/file/')
                ? getFile(req)
                : unknown(req)
        : req.method == 'PUT'
            ? putFile(req)
            : unknown(req)
    )
}))
