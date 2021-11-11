import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { UserGroup } from 'ordercloud-javascript-sdk';

/**
 *  Pull in user info from an excel file, and delete users
 */
 async function run() {
    const creds = config.test.aveda;
    const sdk = await helpers.ocClient(
      creds.clientID,
      creds.clientSecret,
      'Sandbox'
    );
    const buyerID =
      creds.clientID === config.test.aveda.clientID ? 'avedatest' : 'aveda';
    const sheets = await helpers.xcelToJson('AvedaTest_SalonAdminStylistUsers_2021-08-18.xlsx');
    const rows = sheets[0]; // first sheet
    const total = rows.length;
    let progress = 0;
    const errors = {};


    await helpers.batchOperations(
      rows,
      async function singleOperation(row: any) {
        if (row.UserID) {
          try {
            progress++;
            await sdk.Users.Delete(buyerID, row.UserID)
            console.log(`${progress} of ${total} user deleted`);
          } catch (e) {
            console.log('error', e);
            if (e.isOrderCloudError) {
              errors[row.UserID] = {
                Message: e.message,
                Errors: e.errors,
              };
            } else {
              errors[row.UserID] = { Message: e.message };
            }
          }
        }
      },100
    );
    helpers.log(errors, 'user-delete');
  }
  
  run();