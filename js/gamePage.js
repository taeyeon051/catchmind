const log = console.log;

window.onload = () => {
    const game = new GamePage();
}

class GamePage {
    constructor() {
        this.socket = new io();

        this.init();
        this.addEvent();
    }

    init() {
        const { socket } = this;
        const userList = document.querySelectorAll(".user");

        // 유저 나갔을 때
        socket.on('getout-room-user', data => {
            userList.forEach(user => {
                const nicknameDom = user.querySelector(".nickname");
                const answerDom = user.querySelector(".user-answer");
                if (nicknameDom.innerHTML == data.nickname) {
                    nicknameDom.innerHTML = "";
                    answerDom.innerHTML = "";
                }
            });
        });

        // 채팅
        socket.on('game-chatting', data => {
            userList.forEach((user, i) => {
                const nicknameDom = user.querySelector(".nickname");
                if (nicknameDom.innerText == data.nickname) {
                    if (user.querySelector(".chatting")) user.querySelector(".chatting").remove();
                    const chatting = document.createElement("div");
                    if (i < 4) chatting.classList.add("left");
                    else chatting.classList.add("right");
                    chatting.classList.add("chatting");
                    chatting.innerHTML = data.msg;
                    user.appendChild(chatting);
                    setTimeout(() => { chatting.remove(); }, 5000);
                }
            });
        });
    }

    addEvent() {
        window.addEventListener("keydown", e => {
            if ((e.ctrlKey == true && (e.keyCode == 78 || e.keyCode == 82)) || (e.keyCode == 116)) {
                e.cancelBubble = true;
                e.returnValue = false;
            }
        });
    }
}