const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
// session
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
// app
const app = express();
const server = http.createServer(app);
// socket
const socket = require('socket.io');
const io = socket(server);
// db
const db = require(__dirname + '/db/DB.js');
const conn = db.init();
db.connect(conn);
// hash
const bkfd2Password = require('pbkdf2-password');
const hasher = bkfd2Password();

app.set('port', 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// css, js 연결
app.use(express.static(__dirname + '/fonts'));
app.use(express.static(__dirname + '/images'));
app.use(express.static(__dirname + '/css'));
app.use(express.static(__dirname + '/js'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: new MySQLStore({
        host: 'www.yydhsoft.com',
        port: '3306',
        user: 'skills01',
        password: '1234',
        database: 'skills01'
    })
}));

// lib
const lib = require(__dirname + '/Library/Lib.js');

// 라우팅

// 메인페이지
app.get('/', async (req, resp) => {
    if (typeof req.session.loginData === 'undefined') return lib.msgAndGo(resp, '로그인 후 이용 가능합니다.', '/user/login');
    let userList = [];
    let roomList = [];
    const usersql = "SELECT data FROM sessions";
    const roomsql = "SELECT * FROM rooms";
    await conn.query(roomsql, (err, results) => {
        if (err) return lib.msgAndBack(resp, 'DB 오류로 인하여 data를 가져오지 못하였습니다. 잠시 후 다시 시도하여주세요.');
        const nickname = req.session.loginData.nickname;
        results.forEach(room => {
            if (room.leader == nickname) return resp.redirect(`/play/game?id=${room.id}`);
        });
        roomList = results;
    });
    await conn.query(usersql, (err, results) => {
        if (err) return lib.msgAndBack(resp, 'DB 오류로 인하여 data를 가져오지 못하였습니다. 잠시 후 다시 시도하여주세요.');
        for (const result of results) {
            const user = JSON.parse(result.data);
            if (user.loginData == undefined) continue;
            else userList.push(user.loginData.nickname);
        }

        if (req.session.loginData.isLogined) {
            return resp.render('main', { userList, roomList, loginData: req.session.loginData });
        }
    });
});

// 게임 페이지
app.get('/play/game', async (req, resp) => {
    if (typeof req.session.loginData === 'undefined') return lib.msgAndGo(resp, '로그인 후 이용 가능합니다.', '/user/login');
    let data = [];
    let userData = [];
    const id = req.query.id;
    const sql = "SELECT * FROM rooms WHERE id = ?";
    const userSql = "SELECT * FROM users WHERE now_room = ?";
    await conn.query(userSql, [id], (err, results) => {
        let bool = false;
        results.forEach(result => { if (result.user_name == req.session.loginData.nickname) bool = true; });
        if (bool) userData = results;
    });
    await conn.query(sql, [id], async (err, results) => {
        data = await results;
        if (data.length < 1) lib.msgAndGo(resp, '없는 방입니다.', '/');
        else resp.render('game', { data, userData, loginData: req.session.loginData });
    });
});

// 게임 시작
app.post('/game/start', (req, resp) => {
    const { id } = req.body;
    const sql = "UPDATE rooms SET state = ? WHERE id = ?";
    const result = conn.query(sql, ["진행", id]);
    if (result) resp.send('성공');
    else resp.send('실패');
});

// 게임 끝
app.post('/game/end', (req, resp) => {
    const { id } = req.body;
    const sql = "UPDATE rooms SET state = ? WHERE id = ?";
    const result = conn.query(sql, ["대기", id]);
    if (result) resp.send('성공');
    else resp.send('실패');
});

// 방 만들기
app.post('/make/room', async (req, resp) => {
    if (typeof req.session.loginData === 'undefined') return lib.msgAndGo(resp, '로그인 후 이용 가능합니다.', '/user/login');
    const { title, roomPublic, personnel } = req.body;
    const nickname = req.session.loginData.nickname;
    let password = null;
    if (roomPublic == "private") password = req.body.pwd;

    const sql = "INSERT INTO rooms (title, leader, personnel, public, password, state) VALUES (?, ?, ?, ?, ?, ?)";
    const result = await conn.query(sql, [title, nickname, personnel, roomPublic, password, "대기"]);
    if (result) {
        const selSql = "SELECT * FROM rooms WHERE leader = ?";
        await conn.query(selSql, [nickname], (err, results) => {
            const usql = "UPDATE users SET now_room = ? WHERE user_id = ?";
            const updateResult = conn.query(usql, [results[0].id, req.session.loginData.user_id]);
            if (updateResult) {
                if (results) resp.send(JSON.stringify(results));
                else resp.send("실패");
            } else resp.send("실패");
        });
    }
});

// 방 들어가기 전 인원 체크
app.post('/personnel/check', (req, resp) => {
    const id = req.body.id;
    const sql = "SELECT * FROM rooms WHERE id = ?";
    conn.query(sql, [id], (err, results) => {
        if (results[0]) resp.send(JSON.stringify(results));
        else resp.send("실패");
    });
});

// 방 들어가기 전 공개 여부 체크
app.post('/private/check', (req, resp) => {
    const id = req.body.id;
    const sql = "SELECT * FROM rooms WHERE id = ?";
    conn.query(sql, [id], (err, results) => {
        if (results[0]) resp.send(results[0].public);
        else resp.send("실패");
    });
});

// 방 들어가기 전 비밀번호 체크
app.post('/room/password/check', (req, resp) => {
    const { id, pwd } = req.body;
    const sql = "SELECT * FROM rooms WHERE id = ? AND password = ?";
    conn.query(sql, [id, pwd], (err, results) => {
        if (results[0]) resp.send("성공");
        else resp.send("실패");
    });
});

// 방 참여
app.post('/participate/room', (req, resp) => {
    if (typeof req.session.loginData === 'undefined') return lib.msgAndGo(resp, '로그인 후 이용 가능합니다.', '/user/login');
    const id = req.body.id;
    const sql = "SELECT * FROM rooms WHERE id = ?";
    conn.query(sql, [id], (err, results) => {
        try {            
            const nowPersonnel = results[0].personnel.split('/');
            if (nowPersonnel[0] * 1 >= nowPersonnel[1] * 1) return resp.send({ msg: '방인원이 다 찼습니다.' });
            if (results[0].state == "진행") return resp.send({ msg: '게임이 진행중입니다.' });
            const userUpdateSql = "UPDATE users SET now_room = ? WHERE user_id = ?";
            const userUpdate = conn.query(userUpdateSql, [id, req.session.loginData.user_id]);
            if (userUpdate) {
                const personnel = (nowPersonnel[0] * 1 + 1) + '/' + nowPersonnel[1];
                const roomUpdateSql = "UPDATE rooms SET personnel = ? WHERE id = ?";
                const roomUpdate = conn.query(roomUpdateSql, [personnel, id]);
                if (roomUpdate) resp.send("성공")
                else resp.send("실패");
            } else resp.send("실패");
        } catch (e) {
            resp.send("실패");
        }
    });
});

// 방 나갔을 때
app.post('/getout/room', (req, resp) => {
    const { id, nickname } = req.body;
    const sql = "SELECT * FROM rooms WHERE id = ?";
    conn.query(sql, [id], (err, results) => {
        if (results) {
            const nowPersonnel = results[0].personnel.split('/');
            const personnel = (nowPersonnel[0] * 1 - 1) + '/' + nowPersonnel[1];
            const usql = "UPDATE users SET now_room = ? WHERE user_name = ?";
            const result = conn.query(usql, [null, nickname]);
            const roomUpdateSql = "UPDATE rooms SET personnel = ? WHERE id = ?";
            const roomUpdate = conn.query(roomUpdateSql, [personnel, id]);
            if (result && roomUpdate) resp.send("성공");
            else resp.send("실패");
        } else resp.send("실패");
    });
});

// 방 삭제
app.post('/remove/room', (req, resp) => {
    const id = req.body.id;
    const sql = "SELECT * FROM rooms WHERE id = ?";
    conn.query(sql, [id], (err, results) => {
        if (results) {
            const usql = "UPDATE users SET now_room = ? WHERE now_room = ?";
            const updateResult = conn.query(usql, [null, id]);
            const dsql = "DELETE FROM rooms WHERE id = ?";
            const result = conn.query(dsql, [id]);
            if (result && updateResult) resp.send("성공");
            else resp.send("실패");
        } else resp.send("실패");
    });
});

// 로그인
app.get('/user/login', (req, resp) => {
    if (typeof req.session.loginData === 'undefined') {
        resp.render('login');
    } else {
        if (req.session.loginData.isLogined) {
            return lib.msgAndGo(resp, '이미 로그인 되어있습니다.', '/');
        }
    }
});

app.post('/user/login', (req, resp) => {
    const { id, pwd } = req.body;
    const sql = "SELECT * FROM users WHERE user_id = ?";

    conn.query(sql, [id], (err, results) => {
        if (results.length > 0) {
            const userSalt = results[0].salt;
            const userPass = results[0].user_pwd;
            hasher({ password: pwd, salt: userSalt }, (err, pwd, salt, hash) => {
                if (hash !== userPass) return lib.msgAndBack(resp, '비밀번호가 일치하지 않습니다.');
                else {
                    req.session.loginData = {
                        'user_id': results[0].user_id,
                        'nickname': results[0].user_name,
                        'location': '대기실',
                        'isLogined': true
                    };
                    req.session.save(() => {
                        return lib.msgAndGo(resp, '성공적으로 로그인 되었습니다.', '/');
                    });
                }
            });
        } else {
            return lib.msgAndBack(resp, '존재하지 않은 아이디입니다.');
        }
    });
});

// 회원가입
app.get('/user/register', (req, resp) => {
    if (typeof req.session.loginData === 'undefined') {
        resp.render('register');
    } else {
        if (req.session.loginData.isLogined) {
            return lib.msgAndGo(resp, '이미 로그인 되어있습니다.', '/');
        }
    }
});

app.post('/user/register', async (req, resp) => {
    const { id, nickname, pwd, pwdc } = req.body;
    if (pwd !== pwdc) return lib.msgAndBack(resp, '비밀번호와 확인이 일치하지 않습니다.');

    const sql = "SELECT * FROM users WHERE user_id = ? OR user_name = ?";
    conn.query(sql, [id, nickname], (err, results) => {
        if (results.length < 1) {
            hasher({ password: pwd }, async (err, pass, salt, hash) => {
                if (err) return lib.msgAndBack(resp, 'DB 오류로 인하여 가입에 실패하였습니다.');
                const isql = "INSERT INTO users (user_id, user_name, user_pwd, salt, now_room) VALUES (?, ?, ?, ?, ?)";
                const result = await conn.query(isql, [id, nickname, hash, salt, null]);
                if (result) return lib.msgAndGo(resp, '성공적으로 회원가입 되었습니다.', '/user/login');
            });
        } else {
            return lib.msgAndBack(resp, '아이디 혹은 닉네임이 이미 사용중입니다.');
        }
    });
});

// 로그아웃
app.get('/user/logout', async (req, resp) => {
    const sql = "SELECT * FROM sessions";
    const data = JSON.stringify(req.session);
    await conn.query(sql, [req.session], (err, results) => {
        results.forEach(res => {
            if (res.data == data) {
                const dsql = "DELETE FROM sessions WHERE session_id = ?";
                conn.query(dsql, [res.session_id], (err) => {
                    if (err) return lib.msgAndBack(resp, 'DB 오류로 인하여 로그아웃에 실패하였습니다. ㅋㅋ');
                });
            }
        });
    });
    delete req.session.loginData;
    req.session.save(() => {
        return lib.msgAndGo(resp, '로그아웃 되었습니다.', '/user/login');
    });
});

// 소켓
io.on('connection', socket => {
    console.log('사용자가 접속했습니다.');
    console.log(socket.id);

    let scoreData = [];

    // 게임 페이지 채팅
    socket.on('game-chatting-send', data => {
        io.emit('game-chatting', data);
    });

    // 게임 시작
    socket.on('game-start', data => {
        io.emit('game-start-information', data);
    });

    // 게임 끝
    socket.on('game-end', data => {
        io.emit('end-game', data);
    });

    socket.on('send-score', data => {
        scoreData.push(data);
        io.emit('score-data', scoreData);
    });
    
    // 그림 전송
    socket.on('draw', data => {
        io.emit('draw-image', data);
    });
    
    // 현재 유저 정보 전송
    socket.on('now-user-send', data => {
        io.emit('now-user', data);
    });

    // ----------

    // 메인페이지 채팅
    socket.on('send-msg', data => {
        io.emit('chat-msg', data);
    });

    // 유저 들어왔을 때
    socket.on('user-add', data => {
        io.emit('add-user', data);
    });

    // 유저 나갔을 때
    socket.on('user-remove', data => {
        io.emit('remove-user', data);
    });

    // ----------

    // 방 만들었을 때
    socket.on('room-data', data => {
        io.emit('make-room', data);
    });

    // 방 입장
    socket.on('participate-room', data => {
        io.emit('room-user-update', data);
    });

    // 방 나갔을 때
    socket.on('getout-room', data => {
        io.emit('getout-room-user', data);
    });

    // 방 삭제
    socket.on('remove-room', data => {
        io.emit('remove-room-list', data);
    });

    socket.on('disconnect', () => {
        console.log('사용자가 접속 종료');
    });
});

// 서버 실행
server.listen(app.get('port'), () => {
    console.log(`서버가 ${app.get('port')} 포트에서 실행중입니다.`);
});