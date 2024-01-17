import {Router} from 'express'
import {changeCurrentPassword, getUser, loginUser, logoutUser, refreshTokenValidator, registerUser, updateUserDetails} from '../controller/user.controller.js'
import {upload} from '../middlewares/multer.middleware.js'
import {veryfyJWT} from '../middlewares/auth.controller.js'

const router = Router()

router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ])
    ,registerUser) 
router.route('/login').post(loginUser)
router.route('/getUser').get(veryfyJWT, getUser)
router.route('/logout').get(veryfyJWT,logoutUser)
router.route('/changePassword').post(veryfyJWT, changeCurrentPassword)
router.route('/changeUserDetails').post(
    veryfyJWT,
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    updateUserDetails)
router.route('/refresh-token').post(refreshTokenValidator)

export default router