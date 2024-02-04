import mongoose, {Schema} from 'mongoose'

const playlistSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type:String,
        required: true
    },
    videos: [{
        type: String,
    }],
    owner: {
        type:String,
        required: true
    }
})

export const Playlist = mongoose.model('Playlist',playlistSchema)