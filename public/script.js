const notify = document.querySelector("#notification");
const message = document.querySelector("#message");
const sendAuthButton = document.querySelector("#sendAuthButton");
const startBotButton = document.querySelector("#startBotButton");
const header = document.querySelector("#header");
const barName = document.querySelector("#barName");
const barGraph = document.querySelector("#barGraph");
const scrips = document.querySelector("#scrips");
const panelAuth = document.querySelector("#panelAuth");
const panelScripts = document.querySelector("#panelScripts");


const socket = io("http://localhost:8080");

// ALL FUNCTION BLOCK

function printMessage(e) {
  e.preventDefault();
  socket.emit("token", message.value);
}


// ALL SOCKETS BLOCK 

socket.on("AuthTokenSaved", (data) => {
  const li = document.createElement("li");
  li.innerText = data;
  notify.appendChild(li);
  panelAuth.classList.toggle("active")
  var panel = panelAuth.nextElementSibling;
  panel.style.display = "none";
  panelScripts.classList.toggle("active")
  panel = panelScripts.nextElementSibling;
  panel.style.display = "block";
});



socket.on("startmessage", (data) => {
  const li = document.createElement("li");
  li.innerText = data;
  notify.appendChild(li);
});

socket.on("log", (data) => {
  const li = document.createElement("li");
  li.classList.add("loggedData");
  li.innerText = data;
  notify.appendChild(li);
});





// ALL EVENT LISTNERS BLOCK

sendAuthButton.addEventListener("click", printMessage);
message.addEventListener("keypress", (e) => {
  var key = e.keyCode;
  if (key === 13) {
    printMessage(e);
  }
});

startBotButton.addEventListener("click", (e) => {
  e.preventDefault();
  socket.emit("start", "");
});









// DATA BAR FEED AFTER TAKING POSITIONS


socket.on("barDataSet", (price, sl, tp, name) => {
  barName.innerHTML = name;
  var percent;

  percent = ((price - sl) / (tp - sl)) * 100;
  if (percent > 100) {
    percent = 100;
    barGraph.style = "background-color: red !important";
  }

  if (percent < 50) {
    barGraph.classList.remove("w3-green");
    barGraph.classList.add("w3-red");
  } else {
    barGraph.classList.remove("w3-red");
    barGraph.classList.add("w3-green");
  }
  barGraph.style = "width:" + percent + "%";
});