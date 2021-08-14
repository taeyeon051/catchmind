class GameInit {
    constructor(nickname, leader, userData) {
        this.nickname = nickname;
        this.leader = leader;
        this.userData = userData;
        
        this.socket = new io();
        this.problemList = [];
        this.sequence = [];

        this.init();
    }

    async init() {
        await fetch('/words.json')
            .then(res => res.json())
            .then(json => {
                this.problemList = json;
            });

        this.gameStart();
    }

    gameStart() {
        const { problemList, userData, socket } = this;
        const twentyList = [];
        for (let i = 0; i < 20; i++) {
            const proRan = Math.floor(Math.random() * problemList.length);
            twentyList.push(problemList[proRan]);
            while (true) {
                const userRan = Math.floor(Math.random() * userData.length);
                if (this.sequence[i - 1] == userRan) continue;
                else {
                    this.sequence.push(userRan);
                    break;
                }
            }
        }

        socket.emit('game-start', { problemList: twentyList, sequence: this.sequence, leader });
    }
}