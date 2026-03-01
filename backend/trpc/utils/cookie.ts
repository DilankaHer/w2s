import cookie, { type SerializeOptions } from 'cookie';
import jwt from "jsonwebtoken";
import type { createContext } from './context';

export function getCookie(req: Request, name: string) {
    const cookieHeader = req.headers.get('Cookie')
    if (!cookieHeader) return
    const cookies = cookie.parse(cookieHeader)
    return cookies[name]
}

export function setCookie(
    resHeaders: Headers,
    name: string,
    value: string,
    isMobile: boolean = false,
    options?: SerializeOptions
) {
    if (isMobile) {
        resHeaders.append('X-Auth-Token', cookie.serialize(name, value, options))
    } else {
        resHeaders.append('Set-Cookie', cookie.serialize(name, value, options))
    }
}

export function createToken(user: { id: string, username: string }, ctx: ReturnType<typeof createContext>, isMobile: boolean = false) {
    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN!);
    const token = jwt.sign(
        {
            userId: user.id,
            username: user.username,
        },
        process.env.JWT_SECRET_KEY!,
        {
            expiresIn: expiresIn,
        }
    );

    const cookieOptions: SerializeOptions = {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: expiresIn,
    }

    ctx.setCookie(
        "auth_token",
        token,
        isMobile,
        cookieOptions
    );
}