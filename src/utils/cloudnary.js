import {v2 as cloudnary} from 'cloudinary'
import fs from 'fs'
          
cloudnary.config({ 
  cloud_name: process.env.CLOUDNARY_CLOUD_NAME, 
  api_key: process.env.CLOUDNARY_CLOUD_API_KEY, 
  api_secret: process.env.CLOUDNARY_CLOUD_API_SECRET,
  secure: true
});


const cloudnaryFileUpload = async(localFilePath) =>{
    try {
        if(!localFilePath) return null

        const response = await cloudnary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}


export default cloudnaryFileUpload