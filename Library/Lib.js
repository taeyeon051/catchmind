module.exports = {
    msgAndBack: (resp, msg) => {
        resp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return resp.write(
            `<script>
                alert('${msg}');
                history.back();
            </script>`
        );
    },
    msgAndGo: (resp, msg, url) => {
        resp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return resp.write(
            `<script>
                alert('${msg}');
                location.href = '${url}';
            </script>`
        );
    }
};