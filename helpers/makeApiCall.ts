import Axios from "axios";
const https = require('https')


const integrationUrl = "https://localhost:5001"

export async function httpPost(endpoint: string, body?: any, bearerToken?: string) {
  return await Axios.post(`${integrationUrl}/${endpoint}`,
    body, {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  })
}

export async function httpDelete(endpoint: string, token?: string) {
  return await Axios.delete(`${integrationUrl}/${endpoint}`,
    {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
}