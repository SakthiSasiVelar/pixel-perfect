const noteInputField = document.getElementById('note-input-field');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const notesContainer = document.getElementById('notes-container');
const sortPreference = document.getElementById('sort-preference');
const notesListContainer = document.getElementById('notes-list-container');
const DB_NAME = 'NotesAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

let db;


function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject("IndexedDB error: " + event.target.error);

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true,  
                });
                objectStore.createIndex("content", "content", { unique: false });
                objectStore.createIndex("timestamp", "timestamp", { unique: false });
            }
        };
    });
}


function addNoteToDB(content) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const timestamp = Date.now();
        
        const note = {
            content: content,
            timestamp: timestamp
        };

        const request = objectStore.add(note);

        request.onsuccess = () => resolve("Note added successfully!");
        request.onerror = (event) => reject("Error adding note: " + event.target.error);
    });
}


function getNotesFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);

        const notes = [];
        const request = objectStore.openCursor();  

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                notes.push(cursor.value);
                cursor.continue();  
            } else {
                resolve(notes);  
            }
        };

        request.onerror = (event) => reject("Error fetching notes: " + event.target.error);
    });
}


function displayNotes(notes) {
    const sortPreferenceValue = sortPreference.value;

    
    notes.sort((a, b) => {
        if (sortPreferenceValue === 'NewestToOldest') {
            return b.timestamp - a.timestamp;
        } else if (sortPreferenceValue === 'OldestToNewest') {
            return a.timestamp - b.timestamp;
        }
    });

    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '';  

    notes.forEach(note => {
        const li = document.createElement('li');
        li.textContent = `${note.content}`;
        notesList.appendChild(li);
    });
}


async function saveNote() {
    const noteContent = noteInputField.value.trim();
    if (noteContent) {
        try {
            await addNoteToDB(noteContent);
            clearNoteInputField();
            clearDraft();
            const notes = await getNotesFromDB();
            displayNotes(notes);  
        } catch (error) {
            console.error(error);
        }
    }
    else{
        alert("Add note to save!")
    }
}


function showNotesContainer() {
    loginButton.style.display = 'none';
    notesContainer.style.display = 'block';
    logoutButton.style.display = 'block';
}

function getCookieNameValueForLogin(){
    return "login=true"
}

function setCookie(){
    document.cookie = getCookieNameValueForLogin();
}

function getCookie(){
    const decodedCookie = decodeURIComponent(document.cookie);
    return decodedCookie;
}

function checkUserLoggedIn(){
   const cookie = getCookie();
   if(getCookieNameValueForLogin() === cookie ){
      showNotesContainer();
      getDraft();
      getSortPreference();
      getNotesFromDB().then(notes => displayNotes(notes));
   }
   else{
    showLoginContainer();
   }
}

function removeCookie(name){
    console.log('called')
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/pixel-perfect/Notes%20App/index.html";
}

function showLoginContainer(){
    notesContainer.style.display = 'none';
    loginButton.style.display = 'block';
    logoutButton.style.display = 'none';
}

function clearNoteInputField(){
    noteInputField.value = '';
}

function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

function getDraft () {
    const content = sessionStorage.getItem('draft');
    if(content){
        noteInputField.value = content;
    }
}

function clearDraft(){
    sessionStorage.removeItem('draft');
}

function saveDraft () {
    const content = noteInputField.value;
    if(content.length > 0){
        sessionStorage.setItem('draft' , content);
    }
    else{
       sessionStorage.removeItem('draft');
    }
}

function saveSortPreference(){
    const sortPreferenceValue = sortPreference.value;
    localStorage.setItem('sortPreference',sortPreferenceValue);
}

function getSortPreference(){
    const sortPreferenceValue = localStorage.getItem('sortPreference');
    if(sortPreferenceValue){
        sortPreference.value = sortPreferenceValue;
    }
}

function clearSortPreference(){
    sortPreference.value = 'NewestToOldest';
    localStorage.removeItem('sortPreference');
}


const debounceSaveDraft = debounce(saveDraft , 300);

loginButton.addEventListener('click' , ()=>{
    setCookie();
    showNotesContainer();
    getNotesFromDB().then(notes => displayNotes(notes));  
})

logoutButton.addEventListener('click',()=>{
    removeCookie('login');
    clearNoteInputField()
    clearDraft();
    clearSortPreference();
    showLoginContainer();
})

noteInputField.addEventListener('input' , ()=>{
   debounceSaveDraft();
});


document.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    saveNote();
});


sortPreference.addEventListener('change' , ()=>{
    saveSortPreference();
    getNotesFromDB().then(notes => displayNotes(notes));  
});


document.addEventListener('DOMContentLoaded' , ()=>{
    openDatabase().then(() => {
        checkUserLoggedIn();
    });
});
