import config from '../../integration-users.config';
import * as helpers from '../../helpers';

/**
 *  Jira Issue: https://four51.atlassian.net/browse/AV-694
 *
 *  Tasks:
 *  - Create UserGroupAssignment
 *      - specified by UserID ("SoldTo-0000" + Customer) and UserGroupID (New Value)
 */
(async function run() {
  const environment = 'prod';
  const creds = config[environment].aveda;
  const buyerID = environment === ('test' as string) ? 'avedatest' : 'aveda';
  const sdk = await helpers.ocClient(
    creds.clientID,
    creds.clientSecret,
    'Production'
  );

  const sheets = await helpers.xcelToJson('User-GroupAssignments.xlsx');
  const rows = sheets[0]; // first sheet
  const total = rows.length;
  let progress = 0;
  const errors = {};
  await helpers.batchOperations(
    rows,
    async function singleOperation(row: {
      'User ID': string; // ex: SoldTo-0000100015
      'Group ID': string; // ex: B2B1011010

    }) {
      try {
        progress++;
        const userID = row[`User ID`];
      
        await sdk.UserGroups.SaveUserAssignment(buyerID, {
          UserGroupID: row['Group ID'],
          UserID: userID,
        });

        console.log(`${progress} of ${total} group assignments updated`);
      } catch (e) {
        const errorID = row[`User ID`];
        if (e.isOrderCloudError) {
          errors[errorID] = {
            Message: e.message,
            Errors: e.errors,
          };
        } else {
          errors[errorID] = { Message: e.message };
        }
      }
    },
    100 // requests that run in parallel
  );
  helpers.log(errors, 'user-assignment');
})();
