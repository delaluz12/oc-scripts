import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { UserGroup } from 'ordercloud-javascript-sdk';

/**
 *  Pull in ug from an excel file, and patch the xp property
 */

async function run() {
  const creds = config.prod.aveda;
  const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, "Production");
  const buyerID = (creds.clientID === config.test.aveda.clientID
    ? 'avedatest'
    : 'aveda');
   // bring in UG ID from list specified.
    const sheets = await helpers.xcelToJson(
      'Copy of Canada.xlsx'
    );
    const rows = sheets[0]; // first sheet
    let userGroups = rows.map( row => {
      return {ID:`SoldTo-0000${row.SAP_ID}`} 
    });


  const total = userGroups.length;
  let progress = 0;
  const errors = {};
  await helpers.batchOperations(userGroups, async function singleOperation(
    usergroup: UserGroup
  ) {
    if(usergroup.ID){
        try{
            progress++;
            sdk.UserGroups.Patch(  buyerID, usergroup.ID, {xp:{"ClosedDoorDate":""}});
            console.log(`${progress} of ${total} salons patched`);

        }
       catch (e) {
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

    
  });
  helpers.log(errors, 'collateral-adminusergroups');
}

run();
