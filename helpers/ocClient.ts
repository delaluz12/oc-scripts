import * as OrderCloudSDK from 'ordercloud-javascript-sdk';
export enum OcEnv {
  Sandbox = 'Sandbox',
  Staging = 'Staging',
  Production = 'Production',
}
export async function ocClient(
  clientID: string,
  clientSecret: string,
  OcEnv: 'Sandbox' | 'Staging' | 'Production'
): Promise<typeof OrderCloudSDK> {
  let environment;
  switch (OcEnv) {
    case 'Sandbox':
      environment = {
        baseApiUrl: 'https://sandboxapi.ordercloud.io',
        timeoutInMilliseconds: 60 * 1000,
      };
      break;
    case 'Staging':
      environment = {
        baseApiUrl: 'https://stagingapi.ordercloud.io',
        timeoutInMilliseconds: 60 * 1000,
      };
      break;
    case 'Production':
      environment = {
        baseApiUrl: 'https://api.ordercloud.io',
        timeoutInMilliseconds: 60 * 1000,
      };
      break;
    default:
      environment = {
        baseApiUrl: 'https://sandboxapi.ordercloud.io',
        timeoutInMilliseconds: 60 * 1000,
      };
  }

  OrderCloudSDK.Configuration.Set(environment);
  const response = await OrderCloudSDK.Auth.ClientCredentials(
    clientSecret,
    clientID,
    ['FullAccess']
  );
  const token = response.access_token;
  if (typeof token !== 'undefined') {
    OrderCloudSDK.Tokens.SetAccessToken(token);
  }
  return OrderCloudSDK;
}
