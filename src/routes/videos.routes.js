import {Router} from 'express'
import { addVideoToPlaylist, createPlaylist, deleteVideo, getAllVideos, uploadVideo, viewVideo } from '../controller/video.controller.js'
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

router.route('/video').post(veryfyJWT, viewVideo)

router.route('/deleteVideo').post(veryfyJWT, deleteVideo)
router.route('/createPlaylist').post(veryfyJWT, createPlaylist)
router.route('/addVideoToPlaylist').post(veryfyJWT, addVideoToPlaylist)
router.route('/getAllVideos').get(veryfyJWT, getAllVideos)

export default router