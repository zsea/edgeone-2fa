export async function onRequestPost(context) {
    const request = context.request;
    let body = await request.json();
    if (!body["code"] || !body["code"].length) {
        return new Response(JSON.stringify({ success: false, message: "code不能为空", time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }

    let appid = await db.get(`sys_appid`, { type: "text" })
        , secret = await db.get('sys_secret', { type: "text" })
        //, sysToken = await db.get('sys_token', { type: "json" })
        , code = body["code"]
        ;

    if (!secret || !secret.length || !appid || !appid.length) {
        return new Response(JSON.stringify({ success: false, message: "access_token无效，请联系管理员。", time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    let response = await fetch(url);
    if (response.status !== 200) {
        return new Response(JSON.stringify({ success: false, message: `登录失败：${response.status}`, time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }
    let info = await response.json();
    if (!info || !info.openid || !info.openid.length) {
        return new Response(JSON.stringify({ success: false, message: `登录错误`, time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }
    return new Response(JSON.stringify({ success: true, data: { openid: info.openid, token: "aaa" } }), {
        headers: {
            'content-type': 'application/json',
            'x-edgeon-time': Date.now(),
        }
    });
}