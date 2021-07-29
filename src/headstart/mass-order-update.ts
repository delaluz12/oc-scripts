import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Order } from 'ordercloud-javascript-sdk';

// Use this script mass patch all orders with an xp property called "IndexPatch"
// and a value containing the reason for the patch and the date.

// Commonly used to sync all orders with the "orderreports" Azure Service Bus Topic
// for SEB reporting.

async function runMassOrderUpdate() {
    // CHANGE FROM STAGING TO PROD
    const creds = config.staging.SEB.Admin;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');

    // CHANGE PATCH NAME, PROVIDE DESCRIPTION AND DATE (ie. 'LineReportFix-2021-07-12' )
    const patch = { xp: { IndexPatch: 'LineReportFix-2021-07-12' } };

    console.log('Retrieving orders...')

    // OPTION A) PATCH ALL - MAIN RUN
    const orders = await helpers.listAll<Order>(sdk.Orders.List, 'Incoming',
    { 
        filters: { IsSubmitted: 'true' }
    });

    // OPTION B) PATCH JUST ONE FOR TESTING PURPOSES (NOTE - THIS IS A REAL ORDER FOR PROD)
    // const testOrder: Order = { ID: 'SEB000999' };
    // const orders = [testOrder]

    console.log('Got all orders')

    const total = orders.length;
    let progress = 1;
    const errors = {};

    console.log(`Patching ${total} orders.`)

    await helpers.batchOperations(orders, async function singleOperation(
        order: Order
    ): Promise<any> {
        try {
            await sdk.Orders.Patch('Incoming', order.ID!, patch);
            console.log(`Patched ${progress} out of ${total}`);

            // For every 2000 orders processed, wait 12 minutes before processing the next batch.
            // Feel free to modify either number value, but dead lettering is likely to occur if the load is much larger or significantly more frequent.
            if (progress % 2000 == 0) {
                await new Promise(resolve => setTimeout(resolve, 720000)); // 12 minute wait for service bus to handle all previous batch's web jobs
            }

            progress++;
        } catch (e) {
            console.log('error')
            errors[order.ID!] = e;
        }
    })
    await helpers.log(errors)
    helpers.log(errors, 'SEB-patch-errors');
    console.log('Batch Operations Complete.')
}

// invoke the proper function here, then debug in the debug panel
runMassOrderUpdate()