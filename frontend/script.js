const todoContainer = document.querySelector(".todo-container")
const inputTodo = document.getElementById("input-todo")
const addTodo = document.getElementById("add-todo")

const BASE_URL = "http://localhost:3700"

let todos = []


// get todos
async function getTodos() {
    try {
        const res = await fetch(`${BASE_URL}/todos`)
        const data = await res.json()
        return data.data
    } catch (err) {
        console.log(err)
    }
}

// add todos
async function addTodoApi() {
    let options = {
        method : "POST",
        headers : {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            desc: inputTodo.ariaValueMax,
            comp: false
        })
    }

    await fetch (`${BASE_URL}/todo`,options)
}

// delete todos
async function deleteTodo(id) {
    await fetch(`${BASE_URL}/todo/${id}`,{method:"DELETE"})
}

// update todo 
async function updateTodo (id,desc,comp) {
    let options = {
        method:"PUT",
        headers: {
            "Content-Type":"application/json"
        },
        body: JSON.stringify({
            desc, comp
        })
    }

    await fetch(`${BASE_URL}/todo/${id}`,options)
    init()
}

// display todos
function displayTodos(todos) {
    todoContainer.innerHTML=""
    todos.forEach(todo=>{

        const todoDiv = document.createElement("div")
        todoDiv.classList.add("todo")

        const todoInfo = document.createElement("div")
        todoInfo.classList.add("todo-info")

        const todoName = document.createElement("p")
        todoName.textContent = todo.desc

        const checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.checked = todo.comp

        checkbox.addEventListener("change", ()=>{
            updateTodo(todo.id, todo,desc, checkbox.checked)
        })

        const btnWrapper = document.createElement("div")
        btnWrapper.classList.add("todo-btn")

        const editBtn = document.createElement("button")
        editBtn.textContent = "Edit"

        editBtn.addEventListener("click", ()=>{
            const newText = prompt("Edit todo", todo.desc)

            if(newText) {
                updateTodo(todo.id, newText, todo.comp)
            }
        })

        const deleteBtn = document.createElement("button")
        deleteBtn.textContent="Delete"

        deleteBtn.addEventListener("click", ()=>{
            deleteTodo(todo.id)
        })

        todoInfo.appendChild(checkbox)
        todoInfo.appendChild(todoName)

        btnWrapper.appendChild(editBtn)
        btnWrapper.appendChild(deleteBtn)

        todoDiv.appendChild(todoInfo)
        todoDiv.appendChild(btnWrapper)

        todoContainer.appendChild(todoDiv)
    })
}

// add todo button 
addTodo.addEventListener("click", async(e)=>{
    e.preventDefault()

    if(inputTodo.value === "") return 
    await addTodoApi()
    inputTodo.value = ""
    init()
})

async function init() {
    todo = await getTodos()
    displayTodos(todos)
}

init()