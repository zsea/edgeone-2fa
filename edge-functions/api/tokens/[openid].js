
function getNumber(buffer) {
    let num = 0;
    for (let i = 0; i < buffer.byteLength; i++) {
        let byte = buffer[i];
        num |= byte << ((4 - i - 1) * 8);
    }
    return num;
}
function uint8ArrayToHex(uint8Array) {
    return Array.prototype.map.call(uint8Array, x => ('0' + x.toString(16)).slice(-2)).join('');
}

async function hmac({ secretKey, message, hash }) {
    const encoder = new TextEncoder();
    const secretKeyBytes = encoder.encode(secretKey);
    const messageBytes = encoder.encode(message);

    const key = await crypto.subtle.importKey('raw', secretKeyBytes, { name: 'HMAC', hash }, false, ['sign']);

    const signature = await crypto.subtle.sign('HMAC', key, messageBytes);
    const signatureArray = new Uint8Array(signature);
    return uint8ArrayToHex(signatureArray);
}
export async function onRequestGet(context) {
    let openid = context.params.openid;
    if (!openid || !openid.length) {
        return new Response("Not Found", { status: 404 });
    }
    let key = `user_${openid}`;
    let value = await db.get(key, { type: "arrayBuffer" });
    if (!value || !value.byteLength) {
        return new Response("Not Found", { status: 404 });
    }
    return new Response(value, {
        headers: {
            'content-type': 'text/plain',
            'x-openid': openid,
        }
    });
}

export async function onRequestPut(context) {
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


    const request = context.request;
    const headers = request.headers;

    let openid = context.params.openid;
    if (!openid || !openid.length) {
        return new Response("Not Found", { status: 404 });
    }

    let value = await request.arrayBuffer();
    //console.log('debug body', value, value.byteLength);
    if (value.byteLength < 4) {
        return new Response("Bad Request", { status: 400 });
    }

    let version = getNumber(new Uint8Array(value.slice(0, 4)));
    let buffer = value.slice(4);

    let key = `sys_token`;
    let token = await db.get(key, { type: "json" });
    if (!token || token.appid !== appid || token.expire_time < Date.now() || !token.access_token) {
        return new Response("Service Error", { status: 500 });
    }
    let access_token = token.access_token;
    let sk = headers.get("x-session-key");
    if (!sk) {
        return new Response("Bad Request", { status: 400 });
    }

    const url = `https://api.weixin.qq.com/wxa/business/getuserencryptkey?access_token=${access_token}&openid=${openid}&signature=${sk}&sig_method=hmac_sha256`;
    let response = await fetch(url);
    if (response.status !== 200) {
        return new Response(JSON.stringify({ status: 1, message: "获取密钥失败", time: Date.now() }), {
            headers: {
                'content-type': 'application/json',
                'x-edgeon-time': Date.now(),
            }
        });
    }
    let pk = await response.json();
    if (!pk || pk.errcode) {
        return new Response("Service Error", { status: 500 });
    }
    let key_info = (pk.key_info_list || []).find(x => x.version === version);
    if (!key_info) return new Response("Service Error", { status: 500 });
    let signLength = getNumber(new Uint8Array(buffer.slice(0, 4)));
    buffer = buffer.slice(4);
    let signatureBytes = buffer.slice(0, signLength);
    buffer = buffer.slice(signLength);
    // 计算签名
    let signature_string = await hmac({ secretKey: key_info.encrypt_key, message: buffer, hash: "SHA-256" });
    let post_signature = uint8ArrayToHex(new Uint8Array(signatureBytes));
    if (signature_string !== post_signature) {
        return new Response("Signature Error", { status: 401 });
    }
    let dataLength = getNumber(new Uint8Array(buffer.slice(0, 4)));
    buffer = buffer.slice(4);
    key = `user_${openid}`;
    let action = "";
    if (dataLength <= 1) {
        await db.delete(key);
        action = "delete";
    }
    else {
        await db.put(key, buffer);
        action = "put";
    }
    return new Response(JSON.stringify({ status: 0, action: action }), {
        headers: {
            'content-type': 'application/json',
            'x-openid': openid,
        }
    }
    )
}

