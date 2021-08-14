const log = console.log;

window.onload = () => {
    const register = new Register();
}

class Register {
    constructor() {
        this.id = document.querySelector("#user-id");
        this.nickname = document.querySelector("#user-nickname");
        this.pwd = document.querySelector("#user-pwd");
        this.pwdc = document.querySelector("#user-pwdc");
        this.btn = document.querySelector("#register-btn");

        this.addEvent();
    }

    addEvent() {
        const { id, nickname, btn } = this;

        id.addEventListener("input", e => this.lengthLimit(id, 50, e, "english"));
        nickname.addEventListener("input", e => this.lengthLimit(nickname, 50, e, "korean"));

        btn.addEventListener("click", e => this.btnClickEvent());
        window.addEventListener("keydown", e => { if (e.keyCode == 13) this.btnClickEvent(); });
    }

    btnClickEvent() {
        const { id, nickname, pwd, pwdc } = this;

        if (this.valueCheck(id.value, nickname.value, pwd.value, pwdc.value)) {
            const form = document.querySelector("form");
            const makeBtn = document.createElement("button");
            makeBtn.style.visibility = "hidden";
            form.appendChild(makeBtn);
            makeBtn.click();
        } else alert("빈 값이 있습니다.");
    }

    valueCheck(id, nickname, pwd, pwdc) {
        if (id.trim() == "" || nickname.trim() == "" || pwd.trim() == "" || pwdc.trim() == "") return false;
        else return true;
    }

    lengthLimit(dom, ml, e, ke) {
        const { value } = dom;
        if (ke == "english") e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, "");
        else e.target.value = e.target.value.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣A-Za-z0-9]/g, "");
        if (value.length >= ml) dom.value = value.substr(0, ml - 1);
    }
}