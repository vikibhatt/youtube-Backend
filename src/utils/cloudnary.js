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

const getPublicIdFromUrl = (url) => {
    const publicIdMatches = url.match(/\/v\d+\/([^/]+)(\/[^.]+)?\./);
    return publicIdMatches ? publicIdMatches[1] : null;
};
  
const destroyOldFilesFromCloudinary = async (oldFilePath) => {
    if (oldFilePath) {
      try {
        await cloudnary.uploader.destroy(getPublicIdFromUrl(oldFilePath));
      } catch (error) {
        console.error(`Error deleting file from Cloudinary`);
      }
    }
};


export {cloudnaryFileUpload, destroyOldFilesFromCloudinary} 