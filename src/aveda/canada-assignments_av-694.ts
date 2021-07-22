import config from '../../integration-users.config';
import * as helpers from '../../helpers';

/**
 *  Jira Issue: https://four51.atlassian.net/browse/AV-694
 *
 *  Tasks:
 *  - Delete UserGroupAssignment
 *      - specified by UserID ("SoldTo-0000" + Customer) and UserGroupID (Old Value)
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

  const sheets = await helpers.xcelToJson('updateReferenceGroupJuly2021.xlsx');
  const rows = sheets[0]; // first sheet
  const total = rows.length;
  let progress = 0;
  const errors = {};
  await helpers.batchOperations(
    rows,
    async function singleOperation(row: {
      'SAP_ID': string; // ex: 100042
      'Old Value': string; // ex: C2B1031010
      'New Value': string; // ex: C2B1031500
    }) {
      try {
        progress++;
        const userID = `SoldTo-0000${row[`SAP_ID`]}`;
        await sdk.UserGroups.DeleteUserAssignment(
          buyerID,
          row['Old Value'],
          userID
        );
        await sdk.UserGroups.SaveUserAssignment(buyerID, {
          UserGroupID: row['New Value'],
          UserID: userID,
        });

        console.log(`${progress} of ${total} group assignments updated`);
      } catch (e) {
        const errorID = row[`SAP_ID`];
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
  helpers.log(errors, 'user-reassignment');
})();
