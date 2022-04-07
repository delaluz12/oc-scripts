import * as helper from 'csvtojson';
import { ApiRole } from 'ordercloud-javascript-sdk';
import * as helpers from '../../helpers';
import { OcEnv } from "../../helpers";
import { Config } from "../models/config";
import * as OrderCloudSDK from 'ordercloud-javascript-sdk';



const config: Config = {
    bachmans: {
        test: {
            clientID: 'AC5DC148-B77A-488B-84EB-297B640A760A',
            clientSecret: 'CRJdpATmFNI8S9ioAdPAY2expwafjcp8urWpc75CalbGNQ64K6WqSk8sx9SN',
            ocEnv: OcEnv.Sandbox
        },
        production: {
            clientID: "5A7A8CD5-5F55-4E68-8B68-A445A999926B",
            clientSecret: "WEr2FkD9InMsbcxwZgo1oILlHVb9oVTnja9hd1mvFH8it8H7Vtd3VwV5OQ7c",
            ocEnv: OcEnv.Production
        }
    }
}

type ENV = 'test' | 'production'

const testBuyerClientId = "cee9561c-3544-4526-aa15-976900d79ab2";
const prodBuyerClientId = "8836be8d-710a-4d2d-98bf-edbe7227e3bb";
const impersonatingBuyerScope: ApiRole[] = [
    'MeAddressAdmin',
    'AddressAdmin', // Only for location owners
    'MeAdmin',
    'MeCreditCardAdmin',
    'MeXpAdmin',
    'UserGroupAdmin',
    'ApprovalRuleAdmin',
    'BuyerUserAdmin',
    'Shopper',
    'BuyerReader',
    'PasswordReset',
    'ProductFacetAdmin',
    'ProductFacetReader',
    'SupplierReader',
    'SupplierAddressReader',
  ];

async function run(env: ENV) {
    console.log(`running process for ${env}`)
    let configToUse
    if(!config.bachmans[env]) {
      throw `No configuration set for ${env}`
    } else {
      configToUse = config.bachmans[env]
    }
    const sdk = await helpers.ocClient(configToUse.clientID, configToUse.clientSecret, configToUse.ocEnv, ['BuyerImpersonation']);
    const sheets = await helpers.xcelToJson('addresses.xlsx');
    const rows = sheets[0] // first sheet
    const total = rows.length;
    let progress = 0;
    console.log(rows[0])
    await helpers.batchOperations(rows, async function singleOperation(row: any): Promise<any> {
        if(row.addressID && row.userID) {
            try {
                progress++
                //const userresults = await sdk.Users.List("Bachmans", {filters: {Username: row.Username}})
    
                const impersonationAuth = await sdk.Users.GetAccessToken("Bachmans", row.userID, {
                    ClientID: env === "test" ? testBuyerClientId : prodBuyerClientId,
                    Roles: impersonatingBuyerScope
                })
    
                //patch address
                await OrderCloudSDK.Me.PatchAddress(row.addressID, {CompanyName: ''}, {accessToken: impersonationAuth.access_token})
                console.log(`${progress} of ${total} addresses patched`);
            } catch (e) {
                console.log("an error occured")
                console.log(e.errors) 
            }

            
        }
    }, 100)
}

run('production')