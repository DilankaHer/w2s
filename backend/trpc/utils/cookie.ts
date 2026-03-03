import cookie, { type SerializeOptions } from 'cookie';
import jwt from "jsonwebtoken";
import type { IAuthService } from '../interfaces/auth.interface';

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

export function createJWTToken(info: IAuthService) {
    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN!);
    const token = jwt.sign(
        {
            userId: info.userId,
            username: info.username
        },
        process.env.JWT_SECRET_KEY!,
        {
            expiresIn: expiresIn,
        }
    );

    return token;
}