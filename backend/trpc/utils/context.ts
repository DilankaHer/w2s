import type {FetchCreateContextFnOptions} from "@trpc/server/adapters/fetch"
import type { SerializeOptions } from "cookie"
import { getCookie, setCookie } from "./cookie"

export const createContext = ({
  req, resHeaders
}: FetchCreateContextFnOptions) => ({
  setCookie: (name: string, value: string, isMobile: boolean = false, options?: SerializeOptions) => { setCookie(resHeaders, name, value, isMobile, options) },
  getCookie: (name: string) => { return getCookie(req, name) },
})