const express = require("express")
const uuid = require("uuid")
const cors = require("cors")
const port = 3700

// u know like creating a scanner class obj
const app = express()
app.use(express.json())
app.use(cors())

let todos = [
    {
        id: 1,
        desc: "making todo application 1",
        comp: false
    },
    {
        id: 2,
        desc: "making todo application 2",
        comp: false
    },
    {
        id: 3,
        desc: "making todo application 3",
        comp: false
    },
    {
        id: 4,
        desc: "making todo application 4",
        comp: false
    },
]

// get, post, put, delete

app.get("/", (req,res)=>{
    res.json({
        msg: "todo app home page"
    })
})

// get all the todo tasks, modify todo task, add a new todo task, delete todo task

app.get("/todos", (req,res)=>{
    res.json({
        msg: "these are all the todos",
        data: todos
    })
})

app.put("/todo/:id", (req,res)=>{
    let el = todos.find((i)=> i.id==req.params.id)
    console.log(req.body)
    if(el) {
        el.desc = req.body.desc
        el.comp = req.body.comp

        res.json({
        msg: "modified todo",
        data: todos
        })
    } else {
        res.json({
            msg: "wrong index"
        })
    }
})

app.post("/todo", (req,res)=>{
    todos.push({id: uuid.v4(), ...req.body})
    res.json({
        msg: "added new todo",
        data: todos
    })
})

app.delete("/todo/:id", (req,res)=>{
    let index = todos.findIndex((i)=> i.id == req.params.id)
    if(index !== -1) {
        todos.splice(index, 1)
        res.json({
        msg: "todo delted",
        data: todos
        })
    } else {
        res.json({
            msg: "wrong id"
        })
    }
})

app.listen(port, ()=>{
    console.log(`todo jc pc webapp running on http://localhost:${port}`)
})