import type { HttpContext, Http2Context, HttpsContext, Next } from "../../type"


const urlParser = (ctx: HttpContext | Http2Context | HttpsContext, next: Next) => {

}

export default urlParser


  // get query () {
  //   console.log(this.req.headers)
  //   console.log((this.req.socket as TLSSocket).encrypted)
  //   const parsedUrl = url.parse(this.req.url || '/', true)
  //   console.log(parsedUrl)
  //   return { ...parsedUrl.query }
  // }