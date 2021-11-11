import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { UserGroup } from 'ordercloud-javascript-sdk';

/**
 * For each salon, determine the last date ordered and stamp on usergroup.xp.DateLastOrdered
 * we will use this to be able to quickly that data on the salon page
 */

async function run() {
  const creds = config.test.aveda;
  const buyerID = (creds.clientID = config.test.aveda.clientID
    ? 'avedatest'
    : 'aveda');
  const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, "Sandbox");

  const salons = await helpers.listAll<UserGroup>(
    sdk.UserGroups.List,
    buyerID,
    {
      filters: { ID: 'SoldTo-*' },
    }
  );

  let errors = {};
  await helpers.batchOperations(salons, async function singleOperation(
    salon: UserGroup
  ): Promise<any> {
    try {
      const ordersSubmittedLast30days = await sdk.Orders.List('incoming', {
        sortBy: '!DateSubmitted',
        filters: {
          IsSubmitted: 'true',
          FromUserID: salon.ID,
        },
      });
      let dateLastOrdered: string | null = null;
      let order = ordersSubmittedLast30days.Items[0];
      if (order) {
        dateLastOrdered = order.DateSubmitted;
      }
      await sdk.UserGroups.Patch(buyerID, salon.ID, {
        xp: { DateLastOrdered: dateLastOrdered },
      });
    } catch (e) {
      errors[salon.ID] = e;
    }
  });
  await helpers.log(errors);
}

run();
