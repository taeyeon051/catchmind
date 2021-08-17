const log = console.log;

window.onload = () => {
    const app = new App();
}

class App {
    constructor() {
        this.socket = new io();
        this.nicknamePopup = document.querySelector(".popup#nickname");
        this.isPopup = false;

        this.init();
        this.addEvent();
    }

    init() {
        const { socket } = this;

        // 방 삭제
        socket.on('remove-room-list', data => {
            table.querySelectorAll("tr").forEach(tr => {
                const td = tr.querySelector("td:nth-child(1)");
                if (data.id == td.innerHTML) tr.remove();
            });
        });

        // 유저 추가
        socket.on('add-user', data => {
            const userList = document.querySelectorAll(".user-list li");
            let userCheck = false;
            userList.forEach(user => {
                if (data.nickname == user.innerText) userCheck = true;
            });
            if (!userCheck) {
                const li = document.createElement("li");
                li.innerHTML = data.nickname;
                document.querySelector(".user-list>.list").appendChild(li);
            }
        });

        // 유저 삭제
        socket.on('remove-user', data => {
            const userList = document.querySelectorAll(".user-list li");
            userList.forEach(user => {
                if (user.innerText == data.nickname) user.remove();
            });
        });

        // 방 인원 수 변화
        socket.on('room-user-update', data => { this.roomPersonnel(data); });
        socket.on('getout-room-user', data => { this.roomPersonnel(data); });

        // 진행중
        socket.on('game-start-information', data => {
            const roomList = document.querySelectorAll(".room-list tbody tr");
            roomList.forEach(room => {
                if (data.leader == room.querySelector("td:nth-child(3)").innerText) {
                    room.querySelector("td:nth-child(6)").innerHTML = "진행";
                }
            });
        });

        // 대기중
        socket.on('end-game', data => {
            const roomList = document.querySelectorAll(".room-list tbody tr");
            roomList.forEach(room => {
                const id = room.querySelector("td:nth-child(1)");
                if (id.innerHTML == data.id) {
                    room.querySelector("td:nth-child(6)").innerHTML = "대기";
                }
            });
        });
    }

    roomPersonnel(data) {
        $.ajax({
            url: '/personnel/check',
            type: 'POST',
            dataType: 'json',
            data: { id: data.id },
            success: e => {
                const roomList = document.querySelectorAll(".room-list tbody tr");
                roomList.forEach(room => {
                    const id = room.querySelector("td:nth-child(1)");
                    if (id.innerHTML == e[0].id) {
                        room.querySelector("td:nth-child(4)").innerHTML = e[0].personnel;
                    }
                });
            }
        })
    }

    addEvent() {
        // 팝업 이벤트
        const makeRoom = document.querySelector("#makeroom-popup-btn");
        const makeRoomPopup = document.querySelector(".popup#makeroom");
        const password = document.querySelector("#room-password");
        makeRoom.addEventListener("click", e => {
            $(makeRoomPopup).fadeIn('slow');
            $(makeRoomPopup).css('display', 'flex');
            password.disabled = true;
            this.isPopup = true;
        });

        // 방 만들기
        const title = document.querySelector("#room-title");
        title.addEventListener("input", e => this.lengthLimit(title, 50));

        const roomPublic = document.querySelector("#room-public");
        roomPublic.addEventListener("change", e => {
            const { value } = e.target;
            if (value == "public") password.disabled = true;
            if (value == "private") password.disabled = false;
        });

        password.addEventListener("input", e => {
            const { value } = e.target;
            if (value.trim() == "") return;
            e.target.value = value.replace(/[^0-9]/g, "");
            // alert("비밀번호는 숫자만 사용가능하며 4~10자여야 합니다.");
            this.lengthLimit(password, 10);
        });

        window.addEventListener("keydown", e => { 
            if (e.keyCode == 13 && this.isPopup) this.makeRoom();
            if (e.keyCode == 37) e.preventDefault();
        });

        const roomTitle = document.querySelector("#room-title");
        $(roomTitle).on("paste", () => { return false; });

        const makeRoomBtn = document.querySelector("#make-room-btn");
        makeRoomBtn.addEventListener("click", e => this.makeRoom());

        // 팝업 닫기 버튼
        const closeBtn = document.querySelector("#reset-btn");
        closeBtn.addEventListener("click", e => {
            $(makeRoomPopup).fadeOut('slow');
            $('.popup input').val("");
            $('#room-public option').eq(0).prop("selected", true);
            $('#room-personnel option').eq(0).prop("selected", true);
            this.isPopup = false;
        });
    }

    lengthLimit(dom, ml) {
        const { value } = dom;
        if (value.length >= ml) dom.value = value.substr(0, ml - 1);
    }

    makeRoom() {
        const { socket } = this;
        const title = document.querySelector("#room-title").value;
        const roomPublic = document.querySelector("#room-public").value;
        const pwd = document.querySelector("#room-password").value;
        const personnel = document.querySelector("#room-personnel").value;

        if (title.trim() === "" || roomPublic.trim() === "" || personnel.trim() === "") return alert("빈 값이 있습니다.");
        if (roomPublic == "private" && pwd.trim() === "") return alert("비밀번호를 입력해주세요.");

        $.ajax({
            url: '/make/room',
            dataType: 'json',
            type: 'POST',
            data: { title, roomPublic, personnel: "1/" + personnel, pwd },
            success: e => {
                if (e == "실패") return alert("잘못된 값이 있습니다.");
                else {
                    socket.emit('room-data', e);
                    location.href = `/play/game?id=${e[0].id}`;
                }
            }
        });
    }
}