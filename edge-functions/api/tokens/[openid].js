export async function onRequestGet(context) {
    let openid = context.params.openid;
    if (!openid || !openid.length) {
        return new Response("Not Found", { status: 404 });
    }
    let key = `user_${openid}`;
    let value = await db.get(key, { type: "text" });
    if (!value || !value.length) {
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
    const request = context.request;
    let openid = context.params.openid;
    if (!openid || !openid.length) {
        return new Response("Not Found", { status: 404 });
    }
    let key = `user_${openid}`;
    let value = await request.arrayBuffer();
    console.log('debug body', value, value.length)
    let action = "";
    if (!value) {
        await db.delete(key);
        action = "delete";
    }
    else {
        await db.put(key, value);
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

