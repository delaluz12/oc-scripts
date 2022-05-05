
import * as helpers from '../../helpers';
import { UserGroup } from 'ordercloud-javascript-sdk';
import { batchOperations, OcEnv } from "../../helpers";
import { Config } from '../models/config';

/**
 *  Pull in ug from an excel file, and patch the xp property
 * 'ClosedDoorDate'
 */

type ENV = 'test' | 'production'

const config: Config = {
  aveda: {
      test: {
          clientID: '3359D35E-395D-4D45-AD04-8A299062BCD8',
          clientSecret: '', // Get this from API portal
          ocEnv: OcEnv.Sandbox
      },
      production: {
        clientID: '3C661280-84E0-4F55-A923-167BB0D0AA9B',
        clientSecret: '', // Get this from API portal
        ocEnv: OcEnv.Production
      }
  }
}


async function run(env: ENV) {
  console.log(`running process for ${env}`)
  let configToUse
  if(!config.aveda[env]) {
    throw `No configuration set for ${env}`
  } else {
    configToUse = config.aveda[env]
  }
  const sdk = await helpers.ocClient(configToUse.clientID, configToUse.clientSecret, configToUse.ocEnv);
  const buyerID = configToUse?.ocEnv === OcEnv.Sandbox ? 'avedatest' : 'aveda'
  const sheets = await helpers.xcelToJson('canada.xlsx');
  const rows = sheets[0]; // first sheet
  let userGroups = rows.map(row => {
    return { ID: `SoldTo-0000${row.SAP_ID}` };
  });

  const total = userGroups.length;
  let progress = 0;
  const errors = {};
  await helpers.batchOperations(
    userGroups,
    async function singleOperation(usergroup: UserGroup): Promise<any> {
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
};

run('production')
