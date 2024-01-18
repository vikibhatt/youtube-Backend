import {Router} from 'express'
import { uploadVideo } from '../controller/video.controller.js'
import {upload} from '../middlewares/multer.middleware.js'
import {veryfyJWT} from '../middlewares/auth.controller.js'

const router = Router()

router.route('/uploadVideo').post(veryfyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ])
    , uploadVideo
)

export default router