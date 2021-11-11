
import config from "../../integration-users.config";
import * as helpers from '../../helpers';
import { UserGroup } from 'ordercloud-javascript-sdk';

/**
 *  Pull in ug from an excel file, and patch the xp property
 * 'ClosedDoorDate'
 */

(async function run() {
  const creds = config.prod.aveda;
  const sdk = await helpers.ocClient(
    creds.clientID,
    creds.clientSecret,
    'Production'
  );
  const buyerID =
    creds.clientID === config.prod.aveda.clientID ?  'aveda' : 'avedatest';
  // bring in UG ID from list specified.
  const sheets = await helpers.xcelToJson('Canada 8.3.21.xlsx');
  const rows = sheets[0]; // first sheet
  let userGroups = rows.map(row => {
    return { ID: `SoldTo-0000${row.SAP_ID}` };
  });

  const total = userGroups.length;
  let progress = 0;
  const errors = {};
  await helpers.batchOperations(
    userGroups,
    async function singleOperation(usergroup: UserGroup) {
      if (usergroup.ID) {
        try {
          progress++;
          await sdk.UserGroups.Patch(buyerID, usergroup.ID, {
            xp: { ClosedDoorDate: '' },
          });
          console.log(`${progress} of ${total} salons patched`);
        } catch (e) {
          console.log('error', e);
          if (e.isOrderCloudError) {
            errors[usergroup.ID] = {
              Message: e.message,
              Errors: e.errors,
            };
          } else {
            errors[usergroup.ID] = { Message: e.message };
          }
        }
      }
    },
    100
  );
  helpers.log(errors, 'xp-closeDoor');
})();
