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
    options?: SerializeOptions
) {
    resHeaders.append('Set-Cookie', cookie.serialize(name, value, options))
}

export function createToken(user: { id: number, username: string }, ctx: ReturnType<typeof createContext>) {
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
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: expiresIn,
    }

    console.log("cookieOptions", cookieOptions);

    ctx.setCookie(
        "auth_token",
        token,
        cookieOptions
    );
}