const {
    m
    , FormData
    , XMLHttpRequest
    , URL
} = window // eslint-disable-line no-undef

const preview = imageURL => 
  m('div.bg-black-20.dib.ma0.w-100.h5', {
    style: {
      background: imageURL.map(
        url => `url(${url}) no-repeat center center`  
      )
      .pop()
      ,backgroundSize: 'cover'
    }
  })
  
const Type = { 
  cata: cases => o => 
    cases[o.case]( o.value )
  
  ,addCase: (p, k) => {
    p[k] = value => ({
        case: k
        ,value
    })
    return p 
  }
}

const UploadState = 
  ['Inactive', 'Signing', 'Uploading', 'Failed']
    .reduce( Type.addCase, Type )

// UploadState -> Boolean
const buttonDisabled = UploadState.cata({
  Inactive: () => false
  ,Uploaded: () => true
  ,Failed: () => false
  ,Uploading: () => true
  ,Signing: () => true
})


// UploadState -> HyperScript
const uploadStatusMessage = UploadState.cata({
  Inactive: () => 'Waiting for file input.'
  ,Uploaded: () => 'File uploaded successfully!'
  ,Failed: error => m('span.red',error.message)
  ,Uploading: progress => progress+'% Uploaded'
  ,Signing: () => 'Signing ...'
})
  


// UploadState -> HyperScript
const buttonText = UploadState.cata({
  Inactive: () => 'Upload'
  ,Uploaded: () => 'Upload'
  ,Failed: () => 'Try Again'
  ,Uploading: () => 'Upload'
  ,Signing: () => 'Upload'
})

const tap = f => (...xs) => {
  console.log('tap', xs)
  return (f(...xs), xs[0])
}

function App(){
  
  const imageURL = []
  
  const uploadState = [
    UploadState.Inactive()
  ]
  
  const file = []
  
  async function onclick(){
    
    try {
      uploadState[0] = UploadState.Signing()

      const signedURL = await m.request({
        method: 'POST'
        ,url: 'https://harth-upload-services.herokuapp.com'
        ,data: {
          filename: imageURL[0]
        }
      })

      const formData = 
        [ ['key', imageURL[0] ]
        , ['file', file[0] ]
        ]
        .reduce(
          tap(
            (fd, kv) => {
              console.log('typeof fd', typeof fd)
              console.log('fd', fd)
              fd.append(...kv)
            }
          )
          ,new FormData()
        )

      function uploadProgress(e){
        uploadState[0] = UploadState.Uploading(
          Math.floor(e.loaded * 100 / e.total)
        )  
        m.redraw()
      }

      function uploadComplete(evt) {
        if (evt.target.responseText == "") {
          uploadState[0] = UploadState.Success()
        } else {
          uploadState[0] = UploadState.Failed(
            new Error( evt.target.responseText )  
          )
        }
        m.redraw()
      }
      
      function uploadFailed(err){
        uploadState[0] = UploadState.Failed(
          err
        )
        m.redraw()
      }

      var xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", uploadProgress, false);
      xhr.addEventListener("load", uploadComplete, false);
      xhr.addEventListener("error", uploadFailed, false);
      xhr.open('POST', signedURL.url);
      xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
      xhr.send(formData);  
    } catch (e) {
      uploadState[0] = UploadState.Failed( e ) 
      m.redraw()
    }
    
  }
  
  function onchange(e){
    imageURL[0] = URL.createObjectURL(e.currentTarget.files[0])
    file[0] = e.currentTarget.files[0]
    uploadState[0] = UploadState.Inactive()
  }
  
  return {
    view(){
      return m('.app.helvetica'
        ,m('input[type=file].pa3.bg-black-20', {
          onchange
        })
        ,preview (imageURL)
        ,m('button.dib.h3.tc', 
          { onclick
          , disabled: imageURL.length == 0
            || uploadState.map( buttonDisabled ).pop()
          }
          , uploadState.map(buttonText).pop()
        )
        ,m('.dib.tc.bg-black-20.black-60'
           , uploadState.map( uploadStatusMessage ).pop()
        )
      )
      
    }
  }
}

m.mount( document.body, App ) // eslint-disable-line no-undef