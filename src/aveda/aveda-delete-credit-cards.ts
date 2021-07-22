import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { UserGroup } from 'ordercloud-javascript-sdk';

/**
 *  Pull in cc from an excel file, and delete cc
 */
 async function run() {
    const creds = config.prod.aveda;
    const sdk = await helpers.ocClient(
      creds.clientID,
      creds.clientSecret,
      'Production'
    );
    const buyerID =
      creds.clientID === config.test.aveda.clientID ? 'avedatest' : 'aveda';
    const sheets = await helpers.xcelToJson('AvedaCCs_2021-06-07 - DELETE.xlsx');
    const rows = sheets[0]; // first sheet
    const total = rows.length;
    let progress = 0;
    const errors = {};


    await helpers.batchOperations(
      rows,
      async function singleOperation(row: any) {
        if (row.CreditCardID) {
          try {
            progress++;
            await sdk.CreditCards.Delete(buyerID, row.CreditCardID)
            console.log(`${progress} of ${total} cc deleted`);
          } catch (e) {
            console.log('error', e);
            if (e.isOrderCloudError) {
              errors[row.CreditCardID] = {
                Message: e.message,
                Errors: e.errors,
              };
            } else {
              errors[row.CreditCardID] = { Message: e.message };
            }
          }
        }
      },100
    );
    helpers.log(errors, 'cc-delete');
  }
  
  run();