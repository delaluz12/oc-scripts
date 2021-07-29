import Axios from "axios";
const https = require('https')


const integrationUrl = "https://localhost:5001"

export async function makeApiCall(endpoint: string, body?: any, bearerToken?: string) {
    return await Axios.post(`${integrationUrl}/${endpoint}`, 
    body, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
}