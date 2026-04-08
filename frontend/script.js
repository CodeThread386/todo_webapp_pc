const BASE_URL = "http://localhost:3000"

const authScreen = document.getElementById("auth-screen")
const appScreen = document.getElementById("app-screen")
const googleSignInEl = document.getElementById("google-signin")
const authErrorEl = document.getElementById("auth-error")
const logoutBtn = document.getElementById("logout-btn")
const todoContainer = document.querySelector(".todo-container")
const inputTodo = document.getElementById("input-todo")
const addTodoBtn = document.getElementById("add-todo")
const apiErrorEl = document.getElementById("api-error")

const TOKEN_KEY = "accessToken"

function clearApiError() {
    apiErrorEl.hidden = true
    apiErrorEl.textContent = ""
}

function showApiError(message) {
    apiErrorEl.textContent = message
    apiErrorEl.hidden = false
}

async function readErrorBody(res) {
    try {
        const data = await res.json()
        return data.error || data.detail || res.statusText
    } catch {
        return res.statusText || `HTTP ${res.status}`
    }
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY)
}

function authHeaders() {
    const t = getToken()
    const headers = { "Content-Type": "application/json" }
    if (t) headers.Authorization = `Bearer ${t}`
    return headers
}

function showAuth(message) {
    appScreen.hidden = true
    authScreen.hidden = false
    if (message) {
        authErrorEl.textContent = message
        authErrorEl.hidden = false
    } else {
        authErrorEl.hidden = true
    }
}

function showApp() {
    authScreen.hidden = true
    appScreen.hidden = false
    authErrorEl.hidden = true
    clearApiError()
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    if (window.google?.accounts?.id) {
        google.accounts.id.disableAutoSelect()
    }
}

async function verifySession() {
    const token = getToken()
    if (!token) {
        showAuth()
        return false
    }
    try {
        const res = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
            clearSession()
            showAuth()
            return false
        }
        await res.json()
        showApp()
        return true
    } catch {
        clearSession()
        showAuth()
        return false
    }
}

async function handleCredentialResponse(response) {
    authErrorEl.hidden = true
    try {
        const res = await fetch(`${BASE_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential })
        })
        const data = await res.json()
        if (!res.ok) {
            showAuth(data.error || "Sign-in failed")
            return
        }
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        showApp()
        await initTodos()
    } catch {
        showAuth("Could not reach the server. Is the API running?")
    }
}

function whenGoogleReady(callback) {
    if (window.google?.accounts?.id) {
        callback()
        return
    }
    const start = Date.now()
    const id = setInterval(() => {
        if (window.google?.accounts?.id) {
            clearInterval(id)
            callback()
        } else if (Date.now() - start > 15000) {
            clearInterval(id)
            authErrorEl.textContent = "Google Sign-In script failed to load."
            authErrorEl.hidden = false
        }
    }, 50)
}

async function initGoogleButton() {
    try {
        const res = await fetch(`${BASE_URL}/auth/config`)
        if (!res.ok) {
            authErrorEl.textContent = `Could not load sign-in config (HTTP ${res.status}). Is the API running?`
            authErrorEl.hidden = false
            return
        }
        let data
        try {
            data = await res.json()
        } catch {
            authErrorEl.textContent = "Invalid response from server for sign-in config."
            authErrorEl.hidden = false
            return
        }
        const { clientId } = data
        if (!clientId) {
            authErrorEl.textContent =
                "Server missing GOOGLE_CLIENT_ID. Add it to backend .env and restart."
            authErrorEl.hidden = false
            return
        }
        googleSignInEl.innerHTML = ""
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false
        })
        google.accounts.id.renderButton(googleSignInEl, {
            theme: "outline",
            size: "medium",
            text: "signin_with",
            shape: "rectangular"
        })
    } catch {
        authErrorEl.textContent = "Could not reach the server. Is the API running?"
        authErrorEl.hidden = false
    }
}

async function getTodos() {
    const res = await fetch(`${BASE_URL}/todos`, { headers: authHeaders() })
    if (res.status === 401) {
        clearSession()
        showAuth("Session expired. Please sign in again.")
        return []
    }
    if (!res.ok) {
        showApiError(await readErrorBody(res))
        return []
    }
    clearApiError()
    return res.json()
}

async function addTodoApi() {
    const res = await fetch(`${BASE_URL}/todo`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
            desc: inputTodo.value,
            comp: false
        })
    })
    if (res.status === 401) {
        clearSession()
        showAuth("Session expired. Please sign in again.")
        return false
    }
    if (!res.ok) {
        showApiError(await readErrorBody(res))
        return false
    }
    clearApiError()
    return true
}

async function deleteTodo(id) {
    const res = await fetch(`${BASE_URL}/todo/${id}`, {
        method: "DELETE",
        headers: authHeaders()
    })
    if (res.status === 401) {
        clearSession()
        showAuth("Session expired. Please sign in again.")
        return
    }
    if (!res.ok) {
        showApiError(await readErrorBody(res))
        return
    }
    clearApiError()
    initTodos()
}

async function updateTodo(id, desc, comp) {
    const res = await fetch(`${BASE_URL}/todo/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ desc, comp })
    })
    if (res.status === 401) {
        clearSession()
        showAuth("Session expired. Please sign in again.")
        return
    }
    if (!res.ok) {
        showApiError(await readErrorBody(res))
        return
    }
    clearApiError()
    initTodos()
}

function displayTodos(todos) {
    todoContainer.innerHTML = ""

    todos.forEach((todo) => {
        const todoDiv = document.createElement("div")
        todoDiv.classList.add("todo")

        const todoInfo = document.createElement("div")
        todoInfo.classList.add("todo-info")

        const todoName = document.createElement("p")
        todoName.textContent = todo.desc

        const checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.checked = todo.comp

        checkbox.addEventListener("change", () => {
            updateTodo(todo._id, todo.desc, checkbox.checked)
        })

        const btnWrapper = document.createElement("div")
        btnWrapper.classList.add("todo-btn")

        const editBtn = document.createElement("button")
        editBtn.type = "button"
        editBtn.textContent = "Edit"
        editBtn.addEventListener("click", () => {
            const newText = prompt("Edit todo", todo.desc)
            if (newText) {
                updateTodo(todo._id, newText, todo.comp)
            }
        })

        const deleteBtn = document.createElement("button")
        deleteBtn.type = "button"
        deleteBtn.textContent = "Delete"
        deleteBtn.addEventListener("click", () => {
            deleteTodo(todo._id)
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

async function initTodos() {
    const todos = await getTodos()
    if (Array.isArray(todos)) {
        displayTodos(todos)
    }
}

addTodoBtn.addEventListener("click", async (e) => {
    e.preventDefault()
    if (inputTodo.value === "") return
    const ok = await addTodoApi()
    if (!ok) return
    inputTodo.value = ""
    initTodos()
})

logoutBtn.addEventListener("click", () => {
    clearSession()
    googleSignInEl.innerHTML = ""
    showAuth()
    whenGoogleReady(() => {
        initGoogleButton()
    })
})

;(async function bootstrap() {
    const ok = await verifySession()
    if (ok) {
        await initTodos()
    }
    whenGoogleReady(() => {
        initGoogleButton()
    })
})()
