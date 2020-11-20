import config from '../../integration-users.config';
import * as helpers from '../../helpers';
import { Order } from 'ordercloud-javascript-sdk';

async function findMismatchedLineItemAndOrderStatuses() {
    const creds = config.test.SEB.Admin;
    const sdk = await helpers.ocClient(creds.clientID, creds.clientSecret, 'Staging');

    console.log("getting outgoing orders by status...")
    const outgoingOrders = await helpers.listAll<Order>(sdk.Orders.List, ["Outgoing", {filters: {"xp.SubmittedOrderStatus": "Open"}}]);
    console.log("Got all outgoing orders")

    const total = outgoingOrders.length;

    console.log(`Found ${total} outgoing orders.`)

    console.log("done")
}

findMismatchedLineItemAndOrderStatuses();