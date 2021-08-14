class Game {
    constructor(data) {
        this.canvas = document.querySelector("#canvas");
        this.ctx = this.canvas.getContext('2d');
        this.colors = ["#000", "#ff1842", "#4294e7", "#84a521", "#ffce21", "#fff"];
        this.nowColor = '#fff';
        this.thick = 5;
        this.eraser = false;
        this.isDraw = false;
        this.start = {};
        this.isGameOver = false;

        this.socket = new io();
        this.id = data.id;
        this.problemList = data.problemList;
        this.sequence = data.sequence;
        this.nickname = data.nickname;
        this.userData = data.userData;
        this.userList = [];
        this.num = 0;
        this.time = 14000;
        this.timer;

        this.addEvent();
        this.init();
    }

    init() {
        const { socket, canvas: c, ctx, nickname } = this;

        const userDomList = document.querySelectorAll(".user");
        userDomList.forEach(user => {
            const nicknameDom = user.querySelector(".nickname");
            if (nicknameDom.innerText !== "") this.userList.push(user);
        });

        this.userList.forEach(user => user.querySelector(".cnt").innerHTML = "0");
        document.querySelector("#point").innerHTML = "0";

        socket.on('draw-image', data => {
            const image = new Image();
            image.src = data.image;
            ctx.drawImage(image, 0, 0, c.width, c.height);
        });

        socket.on('now-user', data => {
            const colors = document.querySelector(".color-picker");
            if (data.user == nickname) {
                colors.style.visibility = 'visible';
                document.querySelector("#game-chatting").disabled = true;
                this.addProDom(data.pro.answer);
            } else {
                document.querySelectorAll(".colors>div").forEach(color => color.classList.remove('selected'));
                document.querySelector("#game-chatting").disabled = false;
                colors.style.visibility = 'hidden';
            }
        });

        socket.on('game-chatting', async data => {
            let { num, problemList } = await this;

            if (problemList != undefined && data.msg == problemList[num].answer) {
                setTimeout(() => {
                    const chat = document.querySelectorAll(".chatting");
                    chat.forEach(c => {
                        if (c.innerText == data.msg) c.style.color = "blue";
                    });
                }, 10);

                this.userList.forEach(user => {
                    const userNickname = user.querySelector(".nickname").innerText;
                    const score = user.querySelector(".cnt").innerText * 1;
                    if (data.nickname == userNickname) user.querySelector(".cnt").innerText = score + 1;
                });

                const ran = Math.floor(Math.random() * 3) + 11;
                const point = document.querySelector("#point");
                if (nickname == data.nickname) point.innerText = point.innerText * 1 + ran;

                this.nextRound();
            }
        });

        const userScore = [];
        socket.on('score-data', data => {
            userScore.push(data);
            this.scoreCheck(userScore);
        });

        this.gameStart();
    }

    addEvent() {
        const { canvas: c, colors } = this;
        c.addEventListener("mousedown", this.startDraw);
        c.addEventListener("mousemove", this.drawMove);
        c.addEventListener("mouseup", this.endDraw);
        c.addEventListener("mouseout", this.endDraw);

        const eraseAllBtn = document.querySelector("#eraseall-btn");
        eraseAllBtn.addEventListener("click", () => this.reset());

        const colorsBtn = document.querySelectorAll(".colors>div");
        colorsBtn.forEach(color => {
            color.addEventListener("click", e => {
                colorsBtn.forEach(x => x.classList.remove('selected'));
                const idx = color.dataset.color;
                if (idx == 6) this.eraser = true;
                else this.nowColor = colors[idx];
                color.classList.add('selected');
            });
        });

        const givingupBtn = document.querySelector("#givingup-btn");
        givingupBtn.addEventListener("click", e => {
            this.nextRound();
        });
    }

    scoreCheck(scoreData) {
        const { userList } = this;
        if (userList.length == scoreData.length) {
            let firstUser = scoreData[0][0];
            scoreData.forEach(score => {
                if (score[0].score > firstUser.score) firstUser = score[0];
            });

            alert(`${firstUser.nickname}님이 ${firstUser.score}점으로 1등하였습니다.`);
            location.reload();
        }
    }

    addProDom(answer) {
        const proDom = document.createElement("div");
        proDom.classList.add("problem");
        proDom.innerHTML =
            `<b>문제</b>
            <div class="answer">${answer}</div>`;
        const gameCanvas = document.querySelector("#game-canvas");
        gameCanvas.appendChild(proDom);
    }

    gameStart() {
        if (this.isGameOver) return;
        const { socket, num, userList } = this;
        const nowRound = document.querySelector(".now-round>.text-primary>b");
        nowRound.innerHTML = ` ${num + 1}`;
        userList.forEach(user => user.classList.remove("selected"));
        if (this.sequence != undefined) {
            const idx = this.sequence[num];
            userList[idx].classList.add("selected");
            const user = userList[idx].querySelector(".nickname").innerText;
            socket.emit('now-user-send', { user, pro: this.problemList[num] });
        }

        this.timerFunction();
    }

    nextRound() {
        const { socket, canvas: c, ctx } = this;

        const problemDom = document.querySelectorAll(".problem");
        problemDom.forEach(proDom => proDom.remove());
        ctx.clearRect(0, 0, c.width, c.height);
        socket.emit('draw', { image: this.getImage() });

        setTimeout(() => {
            if (this.num > 18) this.endGame();
            clearInterval(this.timer);
            this.timer = null;
            this.time = 14000;
            this.num++;
            this.gameStart();
        }, 1000);
    }

    timerFunction() {
        if (this.isGameOver) return;
        const time_m = document.querySelector(".time-m");
        const time_s = document.querySelector(".time-s");
        const time_ms = document.querySelector(".time-ms");
        let min = Math.floor(this.time / 100 / 60);
        let sec = Math.floor(this.time / 100 % 60);
        let minsec = this.time % 60;
        time_m.innerHTML = min;
        time_s.innerHTML = sec < 10 ? "0" + sec : sec;
        time_ms.innerHTML = minsec < 10 ? "0" + minsec : minsec;

        this.timer = setInterval(() => {
            this.time--;

            if (this.time < 1) {
                this.time = 0;
                clearInterval(this.timer);
                this.timer = null;
                this.time = 14000;
                time_m.innerHTML = "0";
                time_s.innerHTML = "00";
                time_ms.innerHTML = "00";
                this.nextRound();
            }

            minsec = this.time % 60;
            if (min != Math.floor(this.time / 100 / 60)) {
                min = Math.floor(this.time / 100 / 60);
                time_m.innerHTML = min;
            }
            if (sec != Math.floor(this.time / 100 % 60)) {
                sec = Math.floor(this.time / 100 % 60);
                time_s.innerHTML = sec < 10 ? "0" + sec : sec;
            }
            time_ms.innerHTML = minsec < 10 ? "0" + minsec : minsec;
        }, 10);
    }

    endGame() {
        const { id, socket } = this;
        this.isGameOver = true;
        $.ajax({
            url: '/game/end',
            type: 'POST',
            data: { id },
            success: e => {
                if (e == "실패") return alert("DB 오류");
                else {
                    const score = { 'user': this.nickname, 'point': 0 };
                    const point = document.querySelector("#point").innerText * 1;
                    score.point = point;

                    socket.emit('send-score', { nickname: score.user, score: score.point });
                    
                    // alert(`${first.user}님이 ${first.score}점으로 1등하였습니다.`);
                    startBtnEvent();
                    socket.emit('game-end', { id });
                }
            }
        });
    }

    startDraw = e => {
        const { ctx, eraser } = this;
        this.isDraw = true;
        this.start.lastX = e.offsetX;
        this.start.lastY = e.offsetY;
        ctx.moveTo(this.start.lastX, this.start.lastY);
        ctx.beginPath();
        if (eraser) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = this.thick + 5;
        } else {
            ctx.strokeStyle = this.nowColor;
            ctx.lineWidth = this.thick;
        }
        ctx.lineCap = "round";
    }

    drawMove = e => {
        const { isDraw, ctx, socket } = this;
        if (!isDraw) return;
        const { x, y } = { x: e.offsetX, y: e.offsetY };
        ctx.lineTo(x, y);
        ctx.stroke();

        this.start.lastX = x;
        this.start.lastY = y;

        socket.emit('draw', { image: this.getImage() });
    }

    endDraw = e => {
        this.ctx.closePath();
        this.isDraw = false;
    }

    reset() {
        const { canvas: c, ctx } = this;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        socket.emit('draw', { image: this.getImage() });
    }

    getImage() {
        const { canvas } = this;
        return canvas.toDataURL();
    }
}