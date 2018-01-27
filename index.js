const {
    m
    , URL
} = window // eslint-disable-line no-undef

const dont = i => i

const preview = uploadState => 
    uploadState.case == 'Inactive'
        ? m('div.bg-black-20.dib.ma0.w-100.h5'
            ,'Drop Zone'
        ) 
        : m('div.bg-black-20.dib.ma0.w-100.h5', {
            style: {
                background: 
                    `url(${uploadState.value.preview}) no-repeat center center`
                ,backgroundSize: 'cover'
            }
        })

const DefineSumType = o => 
    Object.keys(o)
        .map( k => [k, o[k]] )
        .reduce(
            (p, [ k, ks ]) => {

                const of = value => {

                    const badValue =
                        ks.length > 0
                        && (
                            value == null
                            || typeof value != 'object'
                        )

                    if ( badValue ){
                        throw new TypeError(
                            k +' expects {'+ks.join(', ')+'} but received: ' 
                                + value
                        )
                    }

                    const missingValues = 
                        ks.filter(
                            k => !(k in value)
                        )

                    if( missingValues.length ){
                        throw new TypeError(
                            k + ' is missing expected values: '
                                + missingValues.join(',')
                        )
                    }

                    return { 
                        case: k
                        , value
                    }
                }

                p[k] = of

                return p
            }
            ,{
                cata: cases => o => 
                    cases[o.case]( o.value )
            }
        )

const UploadState = DefineSumType({
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
const buttonDisabled = UploadState.cata({
  Inactive: () => true
  ,Unconfirmed: () => false
  ,Processing: () => true
  ,Processed: () => true
  ,Failed: () => false
  ,Uploading: () => true
  ,Signing: () => true
})

// UploadState -> HyperScript
const uploadStatusMessage = UploadState.cata({
  Inactive: () => 'Waiting for file input.'
  ,Unconfirmed: () => 'Upload when ready.'
  ,Processing: () => 'File is being processed'
  ,Processed: () => 'File uploaded.  Upload more?'
  ,Failed: ({error}) => m('span.red',error.message)
  ,Uploading: ({progress}) => progress+'% Uploaded'
  ,Signing: () => 'Signing ...'
})
  


// UploadState -> HyperScript
const buttonText = UploadState.cata({
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

        const { url } = await m.request(
            { method: 'POST'
            , url: 'https://harth-upload-services.herokuapp.com'
            , data: 
                { filename: uploadState.value.file.name
                , filetype: uploadState.value.file.type
                }
            }
        )

        await m.request({
            url
            ,method: 'PUT'
            ,data: uploadState.value.file
            ,headers: 
                { 'Content-Type': uploadState.value.file.type
                }
            ,serialize: dont
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
    uploadState = UploadState.Unconfirmed({
        id: Math.random().toString(15).slice(2)
        ,file: e.currentTarget.files[0]
        ,preview: URL.createObjectURL(e.currentTarget.files[0])
    })
  }
  
  return {
    view(){
      return m('.app.helvetica'
        ,m('input[type=file].pa3.bg-black-20', {
          onchange
        })
        , preview( uploadState )

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