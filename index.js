const {
    m
    , URL
    , FormData
    , sst
} = window // eslint-disable-line no-undef

const endpoint = 'https://harth-upload-services.herokuapp.com'

const UploadState = sst.taggy('UploadState') ({
    Inactive: 
        []
    ,Unconfirmed: 
        ['file', 'id', 'preview']
    ,Signing: 
        ['file', 'id', 'preview']
    ,Uploading: 
        ['progress', 'id', 'file', 'preview']
    ,Failed: 
        ['error', 'id', 'file', 'preview']
    ,Processing: 
        ['file', 'id', 'progress', 'preview']
    ,Processed: 
        ['file', 'id', 'url', 'preview']
})

// UploadState -> Boolean
const buttonDisabled = sst.fold (UploadState) ({
  Inactive: () => true
  ,Unconfirmed: () => false
  ,Processing: () => true
  ,Processed: () => true
  ,Failed: () => false
  ,Uploading: () => true
  ,Signing: () => true
})

// UploadState -> HyperScript
const uploadStatusMessage = sst.fold (UploadState) ({
  Inactive: () => 'Waiting for file input.'
  ,Unconfirmed: () => 'Upload when ready.'
  ,Processing: () => 'File is being processed'
  ,Processed: () => 'File uploaded.  Upload more?'
  ,Failed: ({error}) => m('span.red',error.message)
  ,Uploading: ({progress}) => progress+'% Uploaded'
  ,Signing: () => 'Signing ...'
})
  
// UploadState -> HyperScript
const buttonText = sst.fold(UploadState) ({
  Inactive: () => 'Upload'
  ,Unconfirmed: () => 'Upload'
  ,Processing: () => 'Upload'
  ,Processed: () => 'Upload'
  ,Failed: () => 'Try Again'
  ,Uploading: () => 'Upload'
  ,Signing: () => 'Upload'
})

function App(){
  
  
  let uploadState = 
    UploadState.Inactive()
  
  async function onclick(){
    
    try {
        uploadState = UploadState.Signing(uploadState.value)

        const policyResponse = await m.request(
            { method: 'POST'
            , url: endpoint
            , data: 
                { filename: uploadState.value.file.name
                , filetype: uploadState.value.file.type
                }
            }
        )

        const fd = new FormData()

        Object.keys(policyResponse.fields)
            .filter( k => k.toLowerCase() == k )
            .map( k => [k, policyResponse.fields[k] ] )
            .concat(
                [['file', uploadState.value.file]
                ,['key', uploadState.value.file.name]
                ,['content-type', uploadState.value.file.type]
                ]
            )
            .forEach(
                ([k,v]) => fd.set(k, v)
            )
        
        await m.request({
            url: policyResponse.host.replace('.dualstack','')
            ,method: 'POST'
            ,data: fd
            ,config(xhr){
                xhr.upload.addEventListener(
                    'progress'
                    , uploadProgress
                    , false
                )

                xhr.addEventListener(
                    'load'
                    , uploadComplete
                    , false
                )

                function uploadProgress(e){

                    uploadState = UploadState.Uploading(
                        Object.assign(
                            {}, uploadState.value, {
                                progress: Math.floor(e.loaded * 100 / e.total)
                            }
                        )
                    ) 
                
                    m.redraw()
                }

                function uploadComplete(evt) {
                    if (evt.target.responseText == "") {
                        uploadState = UploadState.Processing(
                            Object.assign({
                                progress: 0
                            }, uploadState.value)
                        )

                        async function poller(){
                            const res = await m.request({
                                method: 'GET'
                                , url: endpoint
                                , data: { file_id: uploadState.value.id }
                            })

                            if( res.status == 'processing' ){
                                setTimeout(poller, 1000)
                            } else {
                                uploadState = UploadState.Processed(
                                    Object.assign({}, uploadState.value, {
                                        url: '/whatever/file.jpg'
                                    })
                                )
                            }
                        }

                        setTimeout(poller, 500)
                        
                    } else {
                        uploadState = UploadState.Failed(
                            Object.assign({}, uploadState.value, {
                                error: new Error(
                                    evt.target.responseXML
                                        .querySelector('Message').innerHTML
                                )
                            })
                        )
                    }
    
                    m.redraw()
                }

            }
        })
    } catch (e) {
      uploadState = UploadState.Failed(
        Object.assign({}, uploadState.value, {
            error: e
        })
      ) 
      m.redraw()
    }
  }
  
  function onchange(e){
    const file =
        ( e.currentTarget.files 
        || e.dataTransfer.files
        )[0]

    uploadState = UploadState.Unconfirmed({
        id: Math.random().toString(15).slice(2)
        ,file
        ,preview: URL.createObjectURL(file)
    })
  }
  
  return {
    view(){
      return m('.app.helvetica'
        ,m('input[type=file].pa3.bg-black-20'
           
            ,{ onchange
            , accept: 'image/*'
            , id: 'uploader'
            , style: 
                { width: '0.1px'
                , height: '0.1px'
                , opacity: 0
                , overflow: 'hidden'
                , position: 'absolute'
                , zIndex: -1
                }
            }
        )
        ,[{
            className:
                'bg-black-20 dib ma0 w-100 h5 dim'
        }]
        .map(
            ({ className }) => m('label'
                ,['','start','end','over','enter','leave']
                    .map( k => 'ondrag'+k )
                    .concat( 'ondrop' )
                    .reduce(
                        (p,k) => {
                            p[k] = e => {
                                if( k == 'ondrop' ){
                                    onchange(e)
                                }
                                if ( 
                                    'ondragoverondragenter'
                                        .includes(k) 
                                ){
                                    e.currentTarget.className = 
                                        className + ' o-20'
                                } else if (
                                    'ondragleaveondragendondrop'
                                        .includes(k)
                                ){
                                    e.currentTarget.className = 
                                        className 
                                            + ' dim'
                                }
                                e.preventDefault()
                                e.stopImmediatePropagation()
        
                            }
                            return p
                        }
                        ,{
                            for: 'uploader'
                            ,style: {
                                background: 
                                    uploadState.case == 'Inactive'
                                    ? ''
                                    : `url(${uploadState.value.preview})`
                                        +`no-repeat center center`
                                ,backgroundSize: 'cover'
                                ,cursor: 'pointer'
                            }
                            ,className
                        }
                )
            )
        )
        [0]
        ,m('button.dib.h3.tc', 
          { onclick
          , disabled: 
                buttonDisabled( uploadState )
          }
          , buttonText(uploadState)
        )
        ,m('.tc.dib.bg-black-20.black-60.h3.overflow-y-auto.pa1'
            +'.flex.justify-center.items-center'
           , uploadStatusMessage(uploadState)
        )
      )
      
    }
  }
}

m.mount( document.body, App ) // eslint-disable-line no-undef