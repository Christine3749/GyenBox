import { cache } from "react"
import { cookies } from "next/headers"
import { ACCESS_COOKIE } from "./hs-account"
import { actorFromToken } from "./hs-server"
export const getServerActor = cache(async () => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  return token ? actorFromToken(token) : null
})
