import type {FetchCreateContextFnOptions} from "@trpc/server/adapters/fetch"
import type { SerializeOptions } from "cookie"
import { getCookie, setCookie } from "./cookie"

export const createContext = ({
  req, resHeaders
}: FetchCreateContextFnOptions) => ({
  setCookie: (name: string, value: string, options?: SerializeOptions) => { setCookie(resHeaders, name, value, options) },
  getCookie: (name: string) => { return getCookie(req, name) },
})