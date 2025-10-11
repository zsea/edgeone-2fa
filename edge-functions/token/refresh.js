
export async function onRequestGet(context) {

    let appid = await db.get(`sys_appid`, { type: "text" })
        , secret = await db.get(`sys_secret`, { type: "text" })
        ;

    if (!appid || !secret || !appid.length || !secret.length) {
        return new Response(JSON.stringify({ success: false, message: "未配置appid或secret", time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }
    let key = `sys_token`;
    let token = await db.get(key, { type: "json" });
    if (token && token.appid === appid && token.expire_time - 10 * 60 * 1000 > Date.now()) {
        return new Response(JSON.stringify({ success: true, message: "无需刷新", time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    let response = await fetch(url);
    if (response.status !== 200) {
        return new Response(JSON.stringify({ success: false, message: `刷新Token失败：${response.status}`, time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }
    token = await response.json();
    if (token.errcode) {
        return new Response(JSON.stringify({ success: false, message: `刷新Token失败！`, error: token, time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }
    token["appid"] = appid;
    token["expire_time"] = Date.now() + token.expires_in * 1000;
    token["updated_at"] = Date.now();
    await db.put(key, JSON.stringify(token));
    return new Response(JSON.stringify({ success: true, message: "刷新成功！", time: Date.now() }), {
        headers: {
            'content-type': 'application/json',
            'x-edgeon-time': Date.now(),
        }
    });
}