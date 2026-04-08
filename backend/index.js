const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")
require("dotenv").config()

const Todo = require("./models/Todo")
const { requireAuth } = require("./middleware/auth")

const app = express()
const port = process.env.PORT || 3000

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

app.use(express.json())
app.use(cors())

async function dropLegacyTodoIdIndex() {
    try {
        await Todo.collection.dropIndex("id_1")
        console.log('Dropped legacy index "id_1" on todos (old schema; it blocked new inserts)')
    } catch (err) {
        if (err.code !== 27 && err.codeName !== "IndexNotFound") {
            console.warn("Todo index cleanup:", err.message)
        }
    }
}

mongoose.connect(process.env.MONGO_URL)
    .then(async () => {
        console.log("Connected to MongoDB")
        await dropLegacyTodoIdIndex()
    })
    .catch((err) => console.error("MongoDB connection error:", err))

app.get("/", (req, res) => {
    res.json({ msg: "todo list server running" })
})

app.get("/auth/config", (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || "" })
})

app.post("/auth/google", async (req, res) => {
    const credential = req.body.credential
    if (!credential) {
        return res.status(400).json({ error: "Missing credential" })
    }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
        return res.status(500).json({ error: "Server auth is not configured" })
    }
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        })
        const payload = ticket.getPayload()
        const sub = payload.sub
        const email = payload.email
        const name = payload.name
        const picture = payload.picture

        const accessToken = jwt.sign(
            { sub, email, name, picture },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        )

        res.json({
            accessToken,
            user: { sub, email, name, picture }
        })
    } catch (err) {
        console.error("Google token verification failed:", err.message)
        res.status(401).json({ error: "Invalid Google credential" })
    }
})

app.get("/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user })
})

app.get("/todos", requireAuth, async (req, res) => {
    try {
        const todos = await Todo.find({ userId: req.user.sub }).sort({ createdAt: -1 })
        res.json(todos)
    } catch (err) {
        console.error("Todo.find failed:", err.message)
        res.status(500).json({ error: "Could not load todos" })
    }
})

app.get("/todo/:id", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: "Invalid todo id" })
    }
    try {
        const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.sub })
        if (todo) {
            res.json({ msg: "task found", data: todo })
        } else {
            res.json({ msg: "task not found" })
        }
    } catch (err) {
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid todo id" })
        }
        console.error("Todo.findOne failed:", err.message)
        res.status(500).json({ error: "Could not load todo" })
    }
})

app.post("/todo", requireAuth, async (req, res) => {
    const desc = typeof req.body.desc === "string" ? req.body.desc.trim() : ""
    if (!desc) {
        return res.status(400).json({ error: "desc is required" })
    }
    try {
        const todo = await Todo.create({
            userId: req.user.sub,
            desc,
            comp: Boolean(req.body.comp)
        })
        res.json({ msg: "task added", data: todo })
    } catch (err) {
        console.error("Todo.create failed:", err.message)
        res.status(500).json({ error: "Could not save todo", detail: err.message })
    }
})

app.put("/todo/:id", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: "Invalid todo id" })
    }
    const desc = typeof req.body.desc === "string" ? req.body.desc.trim() : ""
    if (!desc) {
        return res.status(400).json({ error: "desc is required" })
    }
    try {
        const todo = await Todo.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.sub },
            { desc, comp: Boolean(req.body.comp) },
            { new: true }
        )
        if (todo) {
            res.json({ msg: "todo edited", data: todo })
        } else {
            res.json({ msg: "todo not found" })
        }
    } catch (err) {
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid todo id" })
        }
        console.error("Todo.findOneAndUpdate failed:", err.message)
        res.status(500).json({ error: "Could not update todo", detail: err.message })
    }
})

app.delete("/todo/:id", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: "Invalid todo id" })
    }
    try {
        const todo = await Todo.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.sub
        })
        if (todo) {
            res.json({ msg: "todo deleted", data: todo })
        } else {
            res.json({ msg: "todo not found" })
        }
    } catch (err) {
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid todo id" })
        }
        console.error("Todo.findOneAndDelete failed:", err.message)
        res.status(500).json({ error: "Could not delete todo" })
    }
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
