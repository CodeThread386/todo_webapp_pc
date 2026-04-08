const mongoose = require("mongoose")

const todoSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    desc: {
        type: String,
        required: true
    },
    comp: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

module.exports = mongoose.model("Todo", todoSchema)
