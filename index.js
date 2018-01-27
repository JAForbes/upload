/* eslint-disable fp/no-mutation, fp/no-throw */

const { json, send } = require('micro')
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

const html = fs.readFileSync(__dirname + '/ui/index.html')

async function getComponent(req){
    return html
}

async function getFile(){
    return {
        status: 'processing'
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
            ? req.url == '/'
                ? getComponent(req, res)
            : req.url.startsWith('/file/')
                ? getFile(req, res)
                : unknown(req, res)
        : req.method == 'PUT'
            ? putFile(req, res)
            : unknown(req, res)
    )
}))
